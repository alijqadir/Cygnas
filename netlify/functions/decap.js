const crypto = require("crypto");
const https = require("node:https");

const SUCCESS_TEMPLATE = (payload) => `<!doctype html><meta charset="utf-8"><title>Auth</title><body><script>
function send(){
  try {
    window.opener && window.opener.postMessage('authorization:github:success:${JSON.stringify(
      payload,
    )}', '*');
  } catch (err) {
    console.warn('Unable to notify parent window', err);
  }
}
send();
setTimeout(send, 250);
setTimeout(send, 750);
setTimeout(function(){ try { window.close(); } catch(e){} }, 1200);
</script></body>`;

const ERROR_TEMPLATE = (error, description) => {
  const payload = { error, error_description: description };
  return `<!doctype html><meta charset="utf-8"><title>Auth</title><body><script>var payload=${JSON.stringify(
    payload,
  )};function send(){try{window.opener&&window.opener.postMessage('authorization:github:error:'+JSON.stringify(payload),'*')}catch(e){console.warn('Unable to notify parent window',e)}}send();setTimeout(send,250);setTimeout(send,750);setTimeout(function(){try{window.close()}catch(e){}},1200);</script></body>`;
};

const serializeCookie = (name, value, options = {}) => {
  const segments = [`${name}=${value}`];
  if (options.maxAge) segments.push(`Max-Age=${options.maxAge}`);
  if (options.domain) segments.push(`Domain=${options.domain}`);
  if (options.path) segments.push(`Path=${options.path}`);
  if (options.httpOnly) segments.push("HttpOnly");
  if (options.secure) segments.push("Secure");
  if (options.sameSite) segments.push(`SameSite=${options.sameSite}`);
  return segments.join("; ");
};

const parseCookies = (header = "") =>
  header
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .reduce((acc, cookie) => {
      const index = cookie.indexOf("=");
      if (index === -1) return acc;
      const name = cookie.substring(0, index).trim();
      const value = cookie.substring(index + 1).trim();
      acc[name] = value;
      return acc;
    }, {});

const getEnv = (name) => {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
};

const exchangeCode = ({ clientId, clientSecret, redirectUri, state, code }) =>
  new Promise((resolve, reject) => {
    const payload = JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      state,
      code,
    });

    const request = https.request(
      {
        hostname: "github.com",
        path: "/login/oauth/access_token",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "User-Agent": "cygnas-decaps-cms-auth",
          "Content-Length": Buffer.byteLength(payload),
        },
      },
      (response) => {
        let body = "";
        response.on("data", (chunk) => {
          body += chunk;
        });
        response.on("end", () => {
          if (response.statusCode && response.statusCode >= 200 && response.statusCode < 300) {
            try {
              resolve(JSON.parse(body));
            } catch (error) {
              reject(new Error("Invalid JSON response from GitHub"));
            }
          } else {
            reject(
              new Error(
                `GitHub token exchange failed (${response.statusCode}): ${body || "Empty response"}`,
              ),
            );
          }
        });
      },
    );

    request.on("error", (err) => reject(err));
    request.write(payload);
    request.end();
  });

const getRedirectBase = (event) => {
  const explicit = process.env.OAUTH_REDIRECT_BASE;
  if (explicit) return explicit.replace(/\/+$/, "");
  const proto = event.headers["x-forwarded-proto"] || "https";
  const host = event.headers.host;
  return `${proto}://${host}`;
};

const buildSetCookie = (value, { maxAgeSeconds, expire } = {}) => {
  const options = {
    httpOnly: true,
    secure: true,
    sameSite: "Lax",
    path: "/",
  };
  const domain = process.env.OAUTH_COOKIE_DOMAIN;
  if (domain) options.domain = domain;
  if (expire) {
    options.maxAge = 0;
  } else if (typeof maxAgeSeconds === "number") {
    options.maxAge = maxAgeSeconds;
  }
  return serializeCookie("oauth_state", value, options);
};

const signState = (state) => {
  const secret = getEnv("OAUTH_STATE_SECRET");
  const signature = crypto
    .createHmac("sha256", secret)
    .update(state)
    .digest("hex");
  return `${state}.${signature}`;
};

const verifyState = (signed, expectedState) => {
  if (!signed) return false;
  const [state, signature] = signed.split(".");
  if (!state || !signature) return false;
  const secret = getEnv("OAUTH_STATE_SECRET");
  const validSignature = crypto
    .createHmac("sha256", secret)
    .update(state)
    .digest("hex");
  const signaturesMatch =
    signature.length === validSignature.length &&
    crypto.timingSafeEqual(
      Buffer.from(signature, "utf8"),
      Buffer.from(validSignature, "utf8"),
    );
  return signaturesMatch && state === expectedState;
};

const unauthorized = (description, status = 400) => ({
  statusCode: status,
  headers: {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "Set-Cookie": buildSetCookie("revoked", { expire: true }),
  },
  body: ERROR_TEMPLATE("authorization_failed", description),
});

exports.handler = async (event) => {
  try {
    const clientId = getEnv("GITHUB_CLIENT_ID");
    const clientSecret = getEnv("GITHUB_CLIENT_SECRET");
    const redirectBase = getRedirectBase(event);
    const redirectUri =
      process.env.OAUTH_REDIRECT_URI ||
      `${redirectBase.replace(/\/+$/, "")}/api/decap/callback`;
    const path = event.path.replace(/\/$/, "");
    const originalPath =
      path.endsWith("/auth") || path.endsWith("/callback")
        ? path.split("/").slice(-1)[0]
        : "";

    if (originalPath === "auth") {
      const state = crypto.randomBytes(16).toString("hex");
      const signedState = signState(state);
      const scope = process.env.GITHUB_OAUTH_SCOPE || "repo,user";

      const location = new URL("https://github.com/login/oauth/authorize");
      location.searchParams.set("client_id", clientId);
      location.searchParams.set("redirect_uri", redirectUri);
      location.searchParams.set("state", state);
      location.searchParams.set("scope", scope);

      const payload = {
        provider: "github",
        auth_type: "authorize",
      };

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
          "Set-Cookie": buildSetCookie(signedState, { maxAgeSeconds: 600 }),
        },
        body: `<!doctype html><meta charset="utf-8"><title>Authorize</title><body><script>
try{window.opener&&window.opener.postMessage('authorizing:github','${redirectBase}')}catch(e){console.warn('Parent window message failed',e)}
window.location.replace(${JSON.stringify(location.toString())});
</script></body>`,
      };
    }

    if (originalPath === "callback") {
      const params = event.queryStringParameters || {};
      if (params.error) {
        return unauthorized(params.error_description || params.error);
      }

      const { code, state } = params;
      if (!code || !state) {
        return unauthorized("Missing authorization code or state");
      }

      const cookies = parseCookies(event.headers.cookie || "");
      const signed = cookies.oauth_state;
      if (!verifyState(signed, state)) {
        return unauthorized("State mismatch", 401);
      }

      let tokenPayload;
      try {
        tokenPayload = await exchangeCode({
          clientId,
          clientSecret,
          redirectUri,
          state,
          code,
        });
      } catch (error) {
        return unauthorized(error.message || "GitHub token exchange failed", 502);
      }
      if (tokenPayload.error) {
        return unauthorized(
          tokenPayload.error_description || tokenPayload.error,
        );
      }

      const successPayload = {
        token: tokenPayload.access_token,
        provider: "github",
      };

      return {
        statusCode: 200,
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
          "Set-Cookie": buildSetCookie("revoked", { expire: true }),
        },
        body: SUCCESS_TEMPLATE(successPayload),
      };
    }

    return {
      statusCode: 404,
      headers: { "Content-Type": "text/plain" },
      body: "Not Found",
    };
  } catch (err) {
    console.error("OAuth handler error", err);
    return {
      statusCode: 500,
      headers: { "Content-Type": "text/html; charset=utf-8" },
      body: ERROR_TEMPLATE("server_error", err.message || "Internal error"),
    };
  }
};
