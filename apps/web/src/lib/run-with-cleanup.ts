const runWithCleanup = async (work: () => Promise<void>, cleanup: () => void) => {
  try {
    await work();
  } finally {
    cleanup();
  }
};

export { runWithCleanup };
