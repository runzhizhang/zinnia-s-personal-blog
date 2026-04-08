import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import { app } from "../app.js";

test("GET /rss.xml returns xml channel", async () => {
  const response = await request(app).get("/rss.xml");
  assert.equal(response.status, 200);
  assert.match(response.text, /<rss/);
  assert.match(response.text, /<channel>/);
  assert.match(response.text, /xmlns:content=/);
});
