export function createDraftSaveController(writeDraft) {
  let pending = false;

  return {
    get pending() { return pending; },
    async save(snapshot) {
      if (pending) return { status: "busy" };
      pending = true;
      try {
        await writeDraft(snapshot);
        return { status: "saved", snapshot };
      } catch (error) {
        return { status: "error", error };
      } finally {
        pending = false;
      }
    }
  };
}
