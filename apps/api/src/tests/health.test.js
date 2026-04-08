import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../app.js";

test("GET /health returns ok", async () => {
  const response = await request(app).get("/health");
  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
});
