import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = join(__dirname, "config.json");

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const loadConfig = async () => {
  const raw = await readFile(CONFIG_PATH, "utf8");
  return JSON.parse(raw);
};

const run = (command, args, options = {}) =>
  new Promise((resolve, reject) => {
    execFile(command, args, { windowsHide: true }, (error, stdout, stderr) => {
      const result = {
        command,
        args,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
      };

      if (error) {
        reject(Object.assign(error, result));
        return;
      }

      if (options.print !== false) {
        console.log(`> ${command} ${args.join(" ")}`);
        if (result.stdout) console.log(result.stdout);
        if (result.stderr) console.error(result.stderr);
      }

      resolve(result);
    });
  });

const adbArgs = (config, args) => {
  if (!config.deviceSerial) return args;
  return ["-s", config.deviceSerial, ...args];
};

const adb = (config, args, options) => run(config.adbPath || "adb", adbArgs(config, args), options);

const parseArgs = () => {
  const args = process.argv.slice(2);
  const result = {
    devices: args.includes("--devices") || args.includes("--list"),
    help: args.includes("--help") || args.includes("-h"),
    pin: "",
  };

  const pinFlagIndex = args.findIndex((arg) => arg === "--pin");
  if (pinFlagIndex >= 0) {
    result.pin = args[pinFlagIndex + 1] || "";
  } else {
    const plainPin = args.find((arg) => /^\d[\d\s-]*$/.test(arg));
    result.pin = plainPin || "";
  }

  return result;
};

const showHelp = () => {
  console.log(`
Lotte mobile gift card auto-register helper

Commands:
  node register.js --devices
  node register.js --pin 2342014243781000

Before registering:
  1. Fill config.json appPackage/appActivity.
  2. Fill pinInputTap and registerButtonTap coordinates.
  3. Connect one Android device with USB debugging enabled.
`);
};

const validatePoint = (name, point) => {
  const x = Number(point?.x);
  const y = Number(point?.y);
  if (!Number.isFinite(x) || !Number.isFinite(y) || x <= 0 || y <= 0) {
    throw new Error(`${name} coordinates are not set. Update config.json first.`);
  }
};

const normalizePin = (value) => String(value || "").replace(/\D/g, "");

const escapeInputText = (value) =>
  String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\s/g, "%s")
    .replace(/&/g, "\\&")
    .replace(/</g, "\\<")
    .replace(/>/g, "\\>")
    .replace(/\|/g, "\\|")
    .replace(/;/g, "\\;")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");

const listDevices = async (config) => {
  await adb(config, ["devices", "-l"]);
};

const startApp = async (config) => {
  if (!config.appPackage) {
    throw new Error("appPackage is not set in config.json.");
  }

  if (config.appActivity) {
    await adb(config, ["shell", "am", "start", "-n", `${config.appPackage}/${config.appActivity}`]);
    return;
  }

  await adb(config, ["shell", "monkey", "-p", config.appPackage, "-c", "android.intent.category.LAUNCHER", "1"]);
};

const registerOnePin = async (config, rawPin) => {
  const pin = normalizePin(rawPin);
  if (pin.length !== 16) {
    throw new Error("Pin must contain exactly 16 digits.");
  }

  validatePoint("pinInputTap", config.pinInputTap);
  validatePoint("registerButtonTap", config.registerButtonTap);

  const delayMs = Number(config.delayMs || 800);

  console.log("Checking connected devices...");
  await listDevices(config);

  console.log("Starting target app...");
  await startApp(config);
  await sleep(delayMs);

  console.log("Tapping pin input...");
  await adb(config, ["shell", "input", "tap", String(config.pinInputTap.x), String(config.pinInputTap.y)]);
  await sleep(delayMs);

  console.log("Typing pin...");
  await adb(config, ["shell", "input", "text", escapeInputText(pin)]);
  await sleep(delayMs);

  console.log("Tapping register button...");
  await adb(config, ["shell", "input", "tap", String(config.registerButtonTap.x), String(config.registerButtonTap.y)]);

  console.log("Done. This version only performs input and tap automation; success/failure detection is not implemented yet.");
};

const main = async () => {
  const args = parseArgs();
  if (args.help) {
    showHelp();
    return;
  }

  const config = await loadConfig();

  if (args.devices) {
    await listDevices(config);
    return;
  }

  if (!args.pin) {
    showHelp();
    throw new Error("Missing --pin value.");
  }

  await registerOnePin(config, args.pin);
};

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
