function log(message: string, source = "worker") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  console.log(`${formattedTime} [${source}] ${message}`);
}

async function main() {
  log("Worker starting...");

  try {
    const { runArchiveForAllUsers } = await import("../server/archive");
    await runArchiveForAllUsers();
    log("Worker completed successfully");
  } catch (err: any) {
    log(`Worker failed: ${err.message}`);
    process.exit(1);
  }

  process.exit(0);
}

main();
