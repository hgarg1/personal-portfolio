const prisma = require('./prisma');
const crypto = require('crypto');

/**
 * Generates a unique 40-character SHA-1 hash for a commit based on its content and timestamp
 */
function generateCommitHash(data) {
  const input = JSON.stringify(data) + Date.now().toString() + Math.random().toString();
  return crypto.createHash('sha1').update(input).digest('hex');
}

/**
 * Creates a commit on a branch, updating the branch's HEAD pointer.
 * This runs within a Prisma Transaction client (tx).
 */
async function createCommit(tx, {
  pageId,
  branchId,
  authorId,
  message,
  title,
  description,
  layout,
  themeColor,
  gradient,
  htmlContent,
  cssContent,
  jsContent,
  status,
  metaRobots,
  canonicalUrl,
  ogImage
}) {
  // Find current head commit to set as parent
  const branch = await tx.cMSBranch.findUnique({
    where: { id: branchId }
  });

  const parentId = branch ? branch.headCommitId : null;

  const commitData = {
    title,
    description: description || '',
    layout: layout || 'standard',
    themeColor: themeColor || '#6366f1',
    gradient: gradient || 'linear-gradient(135deg, #9d5cff 0%, #00d4ff 100%)',
    htmlContent: htmlContent || '',
    cssContent: cssContent || '',
    jsContent: jsContent || '',
    status: status || 'DRAFT',
    metaRobots: metaRobots || 'index, follow',
    canonicalUrl: canonicalUrl || '',
    ogImage: ogImage || ''
  };

  const hash = generateCommitHash({ ...commitData, message, parentId, authorId });

  // Create commit
  const commit = await tx.cMSCommit.create({
    data: {
      hash,
      message,
      parentId,
      pageId,
      branchId,
      authorId,
      ...commitData
    }
  });

  // Update branch HEAD
  await tx.cMSBranch.update({
    where: { id: branchId },
    data: { headCommitId: commit.id }
  });

  return commit;
}

/**
 * Creates a new branch for a page, optionally pointing to an existing commit.
 */
async function createBranch(tx, { pageId, name, isDefault = false, sourceBranchId = null }) {
  let headCommitId = null;

  if (sourceBranchId) {
    const srcBranch = await tx.cMSBranch.findUnique({
      where: { id: sourceBranchId }
    });
    if (srcBranch) {
      headCommitId = srcBranch.headCommitId;
    }
  }

  const branch = await tx.cMSBranch.create({
    data: {
      name,
      isDefault,
      pageId,
      headCommitId
    }
  });

  return branch;
}

/**
 * Merges source branch into target branch by creating a Merge Commit on the target branch.
 */
async function mergeBranch(tx, { pageId, sourceBranchId, targetBranchId, authorId, mergeRequestTitle }) {
  const sourceBranch = await tx.cMSBranch.findUnique({
    where: { id: sourceBranchId },
    include: { headCommit: true }
  });

  const targetBranch = await tx.cMSBranch.findUnique({
    where: { id: targetBranchId }
  });

  if (!sourceBranch || !sourceBranch.headCommit) {
    throw new Error('Source branch has no commits');
  }

  if (!targetBranch) {
    throw new Error('Target branch not found');
  }

  // Create a Merge Commit on the target branch inheriting the source HEAD commit content
  const mergeMessage = `Merge branch '${sourceBranch.name}' into '${targetBranch.name}': ${mergeRequestTitle}`;

  const mergeCommit = await createCommit(tx, {
    pageId,
    branchId: targetBranchId,
    authorId,
    message: mergeMessage,
    title: sourceBranch.headCommit.title,
    description: sourceBranch.headCommit.description,
    layout: sourceBranch.headCommit.layout,
    themeColor: sourceBranch.headCommit.themeColor,
    gradient: sourceBranch.headCommit.gradient,
    htmlContent: sourceBranch.headCommit.htmlContent,
    cssContent: sourceBranch.headCommit.cssContent,
    jsContent: sourceBranch.headCommit.jsContent,
    status: sourceBranch.headCommit.status,
    metaRobots: sourceBranch.headCommit.metaRobots,
    canonicalUrl: sourceBranch.headCommit.canonicalUrl,
    ogImage: sourceBranch.headCommit.ogImage
  });

  return mergeCommit;
}

module.exports = {
  createCommit,
  createBranch,
  mergeBranch
};
