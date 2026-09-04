var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_vite = require("vite");
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json({ limit: "10mb" }));
var DATA_FILE = import_path.default.join(process.cwd(), "cloud_store.json");
var cloudState = {
  messages: [],
  calls: [],
  attendance: [],
  productSales: [],
  agents: [],
  teams: [],
  users: [],
  meetings: [],
  leaves: [],
  ezCash: [],
  verifications: [],
  smsLogs: [],
  updatedAt: (/* @__PURE__ */ new Date()).toISOString()
};
if (import_fs.default.existsSync(DATA_FILE)) {
  try {
    const raw = import_fs.default.readFileSync(DATA_FILE, "utf-8");
    cloudState = { ...cloudState, ...JSON.parse(raw) };
  } catch (err) {
    console.error("Failed to load cloud_store.json:", err);
  }
}
var saveCloudState = () => {
  try {
    cloudState.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    import_fs.default.writeFileSync(DATA_FILE, JSON.stringify(cloudState, null, 2));
  } catch (err) {
    console.error("Failed to write cloud_store.json:", err);
  }
};
var sseClients = [];
app.get("/api/stream", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.flushHeaders();
  res.write(`data: ${JSON.stringify({ type: "CONNECTED", updatedAt: cloudState.updatedAt })}

`);
  sseClients.push(res);
  req.on("close", () => {
    const idx = sseClients.indexOf(res);
    if (idx !== -1) {
      sseClients.splice(idx, 1);
    }
  });
});
var broadcastToAllClients = (eventPayload) => {
  const payloadStr = `data: ${JSON.stringify(eventPayload)}

`;
  sseClients.forEach((client) => {
    try {
      client.write(payloadStr);
    } catch (e) {
    }
  });
};
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    connectedClients: sseClients.length,
    updatedAt: cloudState.updatedAt,
    system: "DD WORLD Enterprise Cloud Interconnect Engine (4G/5G Live)"
  });
});
app.get("/api/sync/state", (req, res) => {
  res.json(cloudState);
});
app.post("/api/sync/broadcast", (req, res) => {
  const { type, data } = req.body || {};
  if (!type) {
    return res.status(400).json({ error: "Missing type parameter" });
  }
  if (type === "NEW_MESSAGE" && data) {
    if (!cloudState.messages.some((m) => m.id === data.id)) {
      cloudState.messages.unshift(data);
    }
  } else if (type === "ADD_ATTENDANCE" && data) {
    const existingIdx = cloudState.attendance.findIndex((a) => a.id === data.id);
    if (existingIdx >= 0) {
      cloudState.attendance[existingIdx] = { ...cloudState.attendance[existingIdx], ...data };
    } else {
      cloudState.attendance.unshift(data);
    }
  } else if (type === "ADD_SALE" && data) {
    if (!cloudState.productSales.some((s) => s.id === data.id)) {
      cloudState.productSales.unshift(data);
    }
  } else if (type === "UPDATE_USER_GPS" && data) {
    const targetId = data.id || data.userId;
    if (targetId) {
      const uIdx = cloudState.users.findIndex((u) => u.id === targetId);
      if (uIdx >= 0) {
        cloudState.users[uIdx] = { ...cloudState.users[uIdx], ...data };
      } else {
        cloudState.users.push(data);
      }
    }
  } else if (type === "CREATE_MEETING" && data) {
    if (!cloudState.meetings.some((m) => m.id === data.id)) {
      cloudState.meetings.unshift(data);
    }
  } else if (type === "CANCEL_MEETING" && data) {
    const mId = typeof data === "string" ? data : data.id;
    cloudState.meetings = cloudState.meetings.filter((m) => m.id !== mId);
  } else if (type === "SUBMIT_LEAVE" && data) {
    if (!cloudState.leaves.some((l) => l.id === data.id)) {
      cloudState.leaves.unshift(data);
    }
  } else if (type === "UPDATE_LEAVE" && data) {
    const lIdx = cloudState.leaves.findIndex((l) => l.id === data.id);
    if (lIdx >= 0) {
      cloudState.leaves[lIdx] = { ...cloudState.leaves[lIdx], ...data };
    }
  } else if (type === "ADD_EZCASH" && data) {
    if (!cloudState.ezCash.some((e) => e.id === data.id)) {
      cloudState.ezCash.unshift(data);
    }
  } else if (type === "ADD_AGENT" && data) {
    const uIdx = cloudState.users.findIndex((u) => u.id === data.id);
    if (uIdx >= 0) {
      cloudState.users[uIdx] = { ...cloudState.users[uIdx], ...data };
    } else {
      cloudState.users.push(data);
    }
  } else if (type === "ADD_VERIFICATION" && data) {
    const vIdx = cloudState.verifications.findIndex((v) => v.id === data.id || v.userId === data.userId);
    if (vIdx >= 0) {
      cloudState.verifications[vIdx] = { ...cloudState.verifications[vIdx], ...data };
    } else {
      cloudState.verifications.unshift(data);
    }
  } else if (type === "ADD_SMS_LOG" && data) {
    if (!cloudState.smsLogs.some((s) => s.id === data.id)) {
      cloudState.smsLogs.unshift(data);
    }
  } else if (type === "START_CALL" && data) {
    cloudState.calls.unshift(data);
  } else if (type === "SYNC_USERS_LIST" && Array.isArray(data)) {
    cloudState.users = data;
  }
  saveCloudState();
  broadcastToAllClients({ type, data });
  res.json({ success: true, broadcastedTo: sseClients.length });
});
app.post("/api/native-gps-sync", (req, res) => {
  const record = req.body || {};
  const { employeeId, agentCode, latitude, longitude, accuracy, timestamp, batteryLevel, networkStatus, gpsStatus, source } = record;
  if (!employeeId || latitude === void 0 || longitude === void 0) {
    return res.status(400).json({ error: "Missing required GPS fields" });
  }
  const uIdx = cloudState.users.findIndex(
    (u) => u.employeeId === employeeId || u.agentCode === agentCode || u.id === employeeId
  );
  const updatedGpsData = {
    lastGpsUpdate: timestamp || (/* @__PURE__ */ new Date()).toISOString(),
    latitude,
    longitude,
    accuracy: accuracy || 10,
    batteryLevel: batteryLevel || 100,
    networkStatus: networkStatus || "ONLINE",
    gpsStatus: gpsStatus || "ACTIVE_HIGH_ACCURACY",
    trackingSource: source || "NATIVE_ANDROID_GPS",
    status: "active"
  };
  if (uIdx >= 0) {
    cloudState.users[uIdx] = { ...cloudState.users[uIdx], ...updatedGpsData };
  }
  saveCloudState();
  broadcastToAllClients({
    type: "UPDATE_USER_GPS",
    data: {
      id: uIdx >= 0 ? cloudState.users[uIdx].id : employeeId,
      employeeId,
      agentCode,
      ...updatedGpsData
    }
  });
  res.json({ success: true, receivedTimestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
app.post("/api/native-gps-batch-sync", (req, res) => {
  const records = req.body;
  if (!Array.isArray(records) || records.length === 0) {
    return res.status(400).json({ error: "Array of records expected" });
  }
  records.forEach((rec) => {
    const { employeeId, agentCode, latitude, longitude, accuracy, timestamp, batteryLevel, source } = rec;
    const uIdx = cloudState.users.findIndex(
      (u) => u.employeeId === employeeId || u.agentCode === agentCode || u.id === employeeId
    );
    if (uIdx >= 0) {
      cloudState.users[uIdx] = {
        ...cloudState.users[uIdx],
        lastGpsUpdate: timestamp || (/* @__PURE__ */ new Date()).toISOString(),
        latitude,
        longitude,
        accuracy: accuracy || 10,
        batteryLevel: batteryLevel || 100,
        trackingSource: source || "NATIVE_ANDROID_GPS"
      };
    }
  });
  saveCloudState();
  broadcastToAllClients({
    type: "BATCH_GPS_UPDATE",
    data: { count: records.length, latestRecord: records[records.length - 1] }
  });
  res.json({ success: true, processedCount: records.length });
});
app.post("/api/ai/chat", async (req, res) => {
  try {
    const { prompt } = req.body || {};
    res.json({
      reply: `[DD WORLD AI Cloud System Response]: ${prompt ? `\u0DC3\u0DCA\u0DC0\u0DBA\u0D82\u0D9A\u0DCA\u200D\u0DBB\u0DD3\u0DBA\u0DC0 \u0DC0\u0DD2\u0DC1\u0DCA\u0DBD\u0DDA\u0DC2\u0DAB\u0DBA \u0D9A\u0DBB\u0DB1 \u0DBD\u0DAF\u0DD3: "${prompt}". \u0DB4\u0DAF\u0DCA\u0DB0\u0DAD\u0DD2\u0DBA\u0DDA \u0DC3\u0DA2\u0DD3\u0DC0\u0DD3 \u0DAF\u0DAD\u0DCA\u0DAD 250km \u0DC3\u0DB1\u0DCA\u0DB1\u0DD2\u0DC0\u0DDA\u0DAF\u0DB1 \u0DB8\u0DCF\u0DBB\u0DCA\u0D9C\u0DBA \u0DC4\u0DBB\u0DC4\u0DCF Cloud Sync \u0DC0\u0DD3 \u0D87\u0DAD.` : "DD WORLD AI \u0DC3\u0DA2\u0DD3\u0DC0\u0DD3\u0DC0 \u0D9A\u0DCA\u200D\u0DBB\u0DD2\u0DBA\u0DCF\u0DAD\u0DCA\u0DB8\u0D9A\u0DBA\u0DD2."}`
    });
  } catch (err) {
    res.status(500).json({ error: "AI processing error" });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`DD WORLD Enterprise Cloud Server listening on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
