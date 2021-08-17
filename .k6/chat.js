import { check, sleep } from "k6";
import cable from "k6/x/cable";
import { randomIntBetween } from "https://jslib.k6.io/k6-utils/1.1.0/index.js";

import { Trend } from "k6/metrics";

let rttTrend = new Trend("rtt", true);

let userId = `100${__VU}`;
let userName = `Kay${userId}`;

const URL = __ENV.CABLE_URL || "ws://localhost:8080/cable";

export let options = {
  thresholds: {
    checks: ["rate>0.9"],
  },
};

export default function () {
  let client = cable.connect(URL, {
    cookies: `uid=${userName}/${userId}`,
  });

  if (
    !check(client, {
      "successful connection": (obj) => obj,
    })
  ) {
    fail("connection failed");
  }

  let channel = client.subscribe("ChatChannel", { id: "demo" });

  if (
    !check(channel, {
      "successful subscription": (obj) => obj,
    })
  ) {
    fail("failed to subscribe");
  }

  for (let i = 0; i < 5; i++) {
    let startMessage = Date.now();
    channel.perform("speak", { message: `hello from ${userName}` });

    let message = channel.receive((msg) => msg.author_id === userId);

    if (
      !check(message, {
        "received its own message": (obj) => obj,
      })
    ) {
      fail("expected message hasn't been received");
    }

    let endMessage = Date.now();
    rttTrend.add(endMessage - startMessage);

    sleep(randomIntBetween(5, 10) / 10);
  }

  client.disconnect();
}
