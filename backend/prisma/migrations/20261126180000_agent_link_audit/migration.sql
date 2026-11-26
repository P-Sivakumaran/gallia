-- Audit actions for admin-entered player → agent links (Gallia mapping Phase 3, cited news only).
ALTER TYPE "AdminActionType" ADD VALUE 'AGENT_LINK_ADD';
ALTER TYPE "AdminActionType" ADD VALUE 'AGENT_LINK_REMOVE';
