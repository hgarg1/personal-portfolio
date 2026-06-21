const express = require('express');
const router = express.Router();
const prisma = require('../lib/prisma');
const bcrypt = require('bcryptjs');
const { streamText } = require('ai');
const { z } = require('zod');
const { aiRateLimiter } = require('../lib/rate-limiter');
const { loadResumeText } = require('../lib/resume');
const { logAction } = require('../lib/audit');

// helper helper to generate a random password
function generateStrongPassword() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let pwd = '';
  for (let i = 0; i < 12; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

// POST /api/ai/chat - AI Assistant Chat Endpoint with context and tools
router.post('/chat', aiRateLimiter, async (req, res) => {
  const { messages, url, pageContent } = req.body;

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'Messages array is required' });
  }

  try {
    // 1. Log chat message interaction with public vs protected distinction
    const isProtected = url && (url.includes('/admin') || url.includes('/cms'));
    const pageType = isProtected ? 'protected' : 'public';
    const lastMessage = messages[messages.length - 1]?.content || '';

    await logAction({
      action: 'ai_chat.message',
      details: {
        pageType,
        pageUrl: url || 'Unknown',
        query: lastMessage.substring(0, 500),
        messageCount: messages.length
      },
      actorId: req.session && req.session.user ? req.session.user.id : null,
      actorEmail: req.session && req.session.user ? req.session.user.email : 'Anonymous Visitor',
      targetId: null,
      targetEmail: 'AI Assistant'
    });

    // 2. Load resume context from the PDF
    const resumeText = await loadResumeText();

    // 2. Build the system prompt
    let systemPrompt = `You are a helpful, professional, and charming AI Portfolio Assistant for Harshit Garg's personal website.
Your job is to answer questions about Harshit Garg, his experience, projects, skills, education, and GPA using the provided resume context.
Be concise, clear, and direct. Use markdown for styling (like bold text or bullet lists) where appropriate.

Context of the page the user is currently viewing:
- URL: ${url || 'Unknown'}
- Page Text Content: "${pageContent || 'None'}"

Here is Harshit Garg's official resume context:
=========================================
${resumeText}
=========================================

If the user asks about the page they are on, use the Page Text Content context.
If a question is outside Harshit's resume and details, answer politely that you only have access to Harshit's resume details.`;

    // 3. Check authentication for User Management MCP Tools
    const isAuthAdmin = !!(req.session && req.session.user && req.session.user.role === 'ADMIN');

    if (isAuthAdmin) {
      systemPrompt += `\n\n[ADMIN MODE TRIGGERED]
You have access to administrative User Management tools.
- To see users: call the 'listUsers' tool.
- To delete a user: call the 'confirmUserDeletion' tool. Do NOT try to delete garg.archie@gmail.com.
- To reset a password: call the 'confirmPasswordReset' tool.
- To update a role: call the 'confirmRoleUpdate' tool.
Tell the admin what you are doing. If a tool requires confirmation (like deletion, reset, or role changes), explain that they need to click the Confirm button in the chat card.`;
    }

    // 4. Call streamText
    const result = streamText({
      model: 'openai/gpt-4o-mini',
      system: systemPrompt,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content
      })),
      tools: isAuthAdmin ? {
        listUsers: {
          description: 'Retrieve a list of all user accounts on the platform (names, emails, roles, and status).',
          parameters: z.object({}),
          execute: async () => {
            try {
              const users = await prisma.portfolioUser.findMany({
                select: { id: true, name: true, email: true, role: true, emailVerified: true, createdAt: true }
              });
              return { success: true, users };
            } catch (err) {
              return { success: false, error: err.message };
            }
          }
        },
        confirmUserDeletion: {
          description: 'Initiate user deletion. Returns confirmation details for the admin.',
          parameters: z.object({
            userId: z.number().describe('The database ID of the user to delete'),
            email: z.string().describe('The email address of the user to delete')
          }),
          execute: async ({ userId, email }) => {
            return {
              status: 'pending_confirmation',
              action: 'delete',
              userId,
              email,
              message: `Confirm Deletion: Are you sure you want to permanently delete user "${email}"?`
            };
          }
        },
        confirmPasswordReset: {
          description: 'Initiate password reset. Returns confirmation details for the admin.',
          parameters: z.object({
            userId: z.number().describe('The database ID of the user'),
            email: z.string().describe('The email address of the user')
          }),
          execute: async ({ userId, email }) => {
            return {
              status: 'pending_confirmation',
              action: 'reset_password',
              userId,
              email,
              message: `Confirm Reset: Are you sure you want to reset the password for user "${email}"?`
            };
          }
        },
        confirmRoleUpdate: {
          description: 'Initiate a user role update. Returns confirmation details for the admin.',
          parameters: z.object({
            userId: z.number().describe('The database ID of the user'),
            email: z.string().describe('The email address of the user'),
            newRole: z.enum(['VIEWER', 'EDITOR', 'ADMIN']).describe('The target privilege role')
          }),
          execute: async ({ userId, email, newRole }) => {
            return {
              status: 'pending_confirmation',
              action: 'update_role',
              userId,
              email,
              newRole,
              message: `Confirm Role Update: Are you sure you want to change "${email}" to role "${newRole}"?`
            };
          }
        }
      } : undefined
    });

    // 5. Stream response to client
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    for await (const chunk of result.textStream) {
      res.write(chunk);
    }

    // Capture and write tool calls if any were made
    const toolCalls = await result.toolCalls;
    const toolResults = await result.toolResults;

    if (toolCalls && toolCalls.length > 0) {
      res.write(`\n[TOOL_CALLS]:${JSON.stringify({ toolCalls, toolResults })}`);
    }

    res.end();
  } catch (err) {
    console.error('❌ Error in AI chat route:', err);
    if (!res.headersSent) {
      try {
        res.removeHeader('Transfer-Encoding');
      } catch (e) {}
      
      const isRateLimit = err.statusCode === 429 || 
                          err.type === 'rate_limit_exceeded' ||
                          (err.message && err.message.toLowerCase().includes('rate-limit')) ||
                          (err.message && err.message.toLowerCase().includes('rate_limit')) ||
                          (err.errors && err.errors.some(e => e.statusCode === 429 || e.type === 'rate_limit_exceeded'));

      if (isRateLimit) {
        res.status(429).json({ error: 'Vercel AI Gateway free tier rate limit exceeded. Please try again in a few minutes.' });
      } else {
        res.status(500).json({ error: 'AI Assistant is temporarily unavailable.' });
      }
    } else {
      res.end();
    }
  }
});

// POST /api/ai/execute-tool - Actually execute the validated destructive admin actions
router.post('/execute-tool', async (req, res) => {
  // Safety gate: Requires ADMIN role
  if (!req.session || !req.session.user || req.session.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Access denied: Admin privileges required.' });
  }

  const { action, userId, email, newRole } = req.body;

  if (!action || !userId || !email) {
    return res.status(400).json({ error: 'Missing action, userId, or email' });
  }

  try {
    const id = parseInt(userId, 10);
    const targetUser = await prisma.portfolioUser.findUnique({ where: { id } });

    if (!targetUser || targetUser.email.toLowerCase() !== email.toLowerCase()) {
      return res.status(404).json({ error: 'Target user not found or mismatch' });
    }

    // Safety checks: Cannot modify global admin
    if (targetUser.email === 'garg.archie@gmail.com') {
      return res.status(400).json({ error: 'Cannot perform administrative operations on the system owner.' });
    }

    if (action === 'delete') {
      // Cannot delete self
      if (targetUser.id === req.session.user.id) {
        return res.status(400).json({ error: 'Cannot delete your own admin account.' });
      }

      await prisma.portfolioUser.delete({ where: { id } });

      await logAction({
        action: 'user.delete',
        details: { deletedVia: 'AI Assistant Tool' },
        actorId: req.session.user.id,
        actorEmail: req.session.user.email,
        targetId: targetUser.id,
        targetEmail: targetUser.email
      });

      return res.json({ success: true, message: `User "${email}" deleted successfully.` });
    } 
    
    else if (action === 'reset_password') {
      const newPassword = generateStrongPassword();
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      await prisma.portfolioUser.update({
        where: { id },
        data: { password: hashedPassword }
      });

      await logAction({
        action: 'user.password_reset',
        details: { resetVia: 'AI Assistant Tool' },
        actorId: req.session.user.id,
        actorEmail: req.session.user.email,
        targetId: targetUser.id,
        targetEmail: targetUser.email
      });

      return res.json({ 
        success: true, 
        message: `Password reset successfully.`, 
        newPassword 
      });
    } 
    
    else if (action === 'update_role') {
      if (!newRole) {
        return res.status(400).json({ error: 'New role is required for role update.' });
      }
      const oldRole = targetUser.role;

      await prisma.portfolioUser.update({
        where: { id },
        data: { role: newRole }
      });

      await logAction({
        action: 'user.update',
        details: { oldRole, newRole, updatedVia: 'AI Assistant Tool' },
        actorId: req.session.user.id,
        actorEmail: req.session.user.email,
        targetId: targetUser.id,
        targetEmail: targetUser.email
      });

      return res.json({ success: true, message: `User "${email}" updated from ${oldRole} to ${newRole}.` });
    }

    return res.status(400).json({ error: 'Unknown tool execution action.' });
  } catch (err) {
    console.error('❌ Error executing AI tool:', err);
    res.status(500).json({ error: 'Failed to execute requested action.' });
  }
});

// Middleware to verify authentication for protected AI routes
function isAuthenticatedAdminOrEditor(req, res, next) {
  if (req.session && req.session.user && ['ADMIN', 'EDITOR'].includes(req.session.user.role)) {
    return next();
  }
  res.status(403).json({ error: 'Access denied: Editor or Admin privileges required.' });
}

// POST /api/ai/draft-response - Draft a response to a contact form submission using AI
router.post('/draft-response', isAuthenticatedAdminOrEditor, async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !message) {
    return res.status(400).json({ error: 'Name and message are required' });
  }

  try {
    // 1. Load resume context from the PDF
    const resumeText = await loadResumeText();

    // 2. Build system prompt
    const systemPrompt = `You are Harshit Garg, an AI Systems Architect, Full-Stack Engineer, and Platform Builder.
You are drafting a professional, charming, and helpful email reply to a contact form submission from a visitor on your website.

Here is the context of your background and resume:
=========================================
${resumeText}
=========================================

Visitor Details:
- Name: ${name}
- Email: ${email || 'Not provided'}
- Message:
"${message}"

Instructions for your draft:
- Write the response email in the first person ("I").
- Address the visitor by name politely.
- Address their message directly, using details from your background/resume if they ask about your skills, projects, employment, availability, or experience.
- Keep the tone professional, welcoming, and confident.
- Do NOT include subject lines, placeholders, or standard brackets (like "[Your Name]" or "[Date]"). Sign it off as "Best regards,\nHarshit Garg".
- Output ONLY the email body text.`;

    // 3. Stream text
    const result = streamText({
      model: 'openai/gpt-4o-mini',
      system: systemPrompt,
      messages: [
        { role: 'user', content: `Please draft a reply to the contact submission from ${name}.` }
      ]
    });

    // 4. Stream response to client
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');

    for await (const chunk of result.textStream) {
      res.write(chunk);
    }
    res.end();
  } catch (err) {
    console.error('❌ Error drafting response with AI:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to draft AI response.' });
    } else {
      res.end();
    }
  }
});

// POST /api/ai/send-response - Send the response email to the submitter
router.post('/send-response', isAuthenticatedAdminOrEditor, async (req, res) => {
  const { submissionId, toEmail, toName, subject, responseMessage } = req.body;

  if (!toEmail || !toName || !subject || !responseMessage) {
    return res.status(400).json({ error: 'toEmail, toName, subject, and responseMessage are required.' });
  }

  try {
    const { sendResponseEmail } = require('../lib/email');
    const success = await sendResponseEmail(toEmail, toName, subject, responseMessage);

    if (success) {
      // Create audit log for sending email response
      await logAction({
        action: 'contact.respond',
        details: { sentTo: toEmail, subject },
        actorId: req.session.user.id,
        actorEmail: req.session.user.email,
        targetId: null,
        targetEmail: toEmail
      });

      // Update contact submission replied status in database
      if (submissionId) {
        try {
          await prisma.contactSubmission.update({
            where: { id: parseInt(submissionId, 10) },
            data: { replied: true },
          });
        } catch (dbErr) {
          console.error('❌ Failed to update submission replied status in database:', dbErr);
        }
      }

      return res.json({ success: true, message: 'Response email sent successfully.' });
    } else {
      return res.status(500).json({ error: 'Failed to send email. Check SMTP settings.' });
    }
  } catch (err) {
    console.error('❌ Error sending email response:', err);
    res.status(500).json({ error: 'Failed to send response email.' });
  }
});

module.exports = router;
