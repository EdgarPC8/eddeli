import jwt from "jsonwebtoken";

function createAccessToken({ payload }) {
  return new Promise((resolve, reject) => {
    jwt.sign(
      payload,
      "privateKey",
      { algorithm: "HS256", expiresIn: "1d" },
      (err, token) => {
        if (err) reject(err);
        resolve(token);
      }
    );
  });
}

function getHeaderToken(req) {
  return req.headers["authorization"].split(" ")[1];
}

function verifyJWT(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(token, "privateKey", (err, token) => {
      if (err) reject(err);
      resolve(token);
    });
  });
}

function createLicenseToken({ payload }) {

  return new Promise((resolve, reject) => {
    // const payload = { licenseKey }; // Puedes agregar más información si es necesario

    jwt.sign(
      payload,
      "privateKey",
      { algorithm: "HS256", expiresIn: payload.time }, // Token válido por 30 días
      (err, token) => {
        if (err) reject(err);
        resolve(token);
      }
    );
  });
}

export { createAccessToken, getHeaderToken, verifyJWT,createLicenseToken };
