const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const path = require("path");
const fs = require("fs");

const app = express();
const intentos = [];
const ARCHIVO_USUARIOS = path.join(__dirname, "usuarios.json");

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(
  session({
    secret: "demo-header-validation",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);

// ✅ DEFENSA 3: Middleware de verificación de Origin y Referer
function validarOrigenPeticion(req, res, next) {
  // Solo validamos en peticiones que modifican estado (POST, PUT, DELETE, PATCH)
  if (!["POST", "PUT", "DELETE", "PATCH"].includes(req.method)) {
    return next();
  }

  const origin = req.get("Origin");
  const referer = req.get("Referer");
  const host = req.get("Host");

  // Lista blanca de orígenes permitidos
  const origenesPermitidos = [
    `http://${host}`,
    `https://${host}`,
    `http://localhost:3030`,
  ];

  console.log("🔍 Validando cabeceras:");
  console.log(`  Origin: ${origin || "no presente"}`);
  console.log(`  Referer: ${referer || "no presente"}`);
  console.log(`  Host: ${host}`);

  // Verificar Origin (cabecera más confiable)
  if (origin) {
    if (origenesPermitidos.includes(origin)) {
      console.log(`  ✅ Origin válido: ${origin}`);
      return next();
    } else {
      console.log(`  ❌ Origin rechazado: ${origin}`);
      intentos.unshift({
        ts: new Date().toISOString(),
        method: req.method,
        path: req.path,
        origin: origin || null,
        referer: referer || null,
        permitido: false,
        motivo: "Origin no autorizado",
      });
      if (intentos.length > 200) intentos.pop();
      return res.status(403).send(`
        <h2>🚫 Petición bloqueada por CSRF</h2>
        <p><strong>Razón:</strong> El origen de la petición no está autorizado.</p>
        <p><strong>Origin detectado:</strong> ${origin}</p>
        <p><strong>Orígenes permitidos:</strong> ${origenesPermitidos.join(
          ", "
        )}</p>
        <hr>
        <p>Esta es la <strong>Defensa 3: Verificación de cabeceras Origin/Referer</strong></p>
        <p>El servidor rechaza automáticamente peticiones que no provienen de su propio dominio.</p>
      `);
    }
  }

  // Si no hay Origin, verificar Referer
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const refererOrigin = `${refererUrl.protocol}//${refererUrl.host}`;

      if (origenesPermitidos.includes(refererOrigin)) {
        console.log(`  ✅ Referer válido: ${refererOrigin}`);
        return next();
      } else {
        console.log(`  ❌ Referer rechazado: ${refererOrigin}`);
        intentos.unshift({
          ts: new Date().toISOString(),
          method: req.method,
          path: req.path,
          origin: origin || null,
          referer: refererOrigin,
          permitido: false,
          motivo: "Referer no autorizado",
        });
        if (intentos.length > 200) intentos.pop();
        return res.status(403).send(`
          <h2>🚫 Petición bloqueada por CSRF</h2>
          <p><strong>Razón:</strong> El referer de la petición no está autorizado.</p>
          <p><strong>Referer detectado:</strong> ${refererOrigin}</p>
          <p><strong>Orígenes permitidos:</strong> ${origenesPermitidos.join(
            ", "
          )}</p>
          <hr>
          <p>Esta es la <strong>Defensa 3: Verificación de cabeceras</strong></p>
        `);
      }
    } catch (e) {
      console.log(`  ❌ Referer inválido: ${referer}`);
      intentos.unshift({
        ts: new Date().toISOString(),
        method: req.method,
        path: req.path,
        origin: origin || null,
        referer: referer || null,
        permitido: false,
        motivo: "Referer inválido",
      });
      if (intentos.length > 200) intentos.pop();
      return res.status(403).send("Referer inválido");
    }
  }

  // Si no hay ni Origin ni Referer, rechazamos por seguridad
  console.log("  ❌ No hay Origin ni Referer en la petición");
  intentos.unshift({
    ts: new Date().toISOString(),
    method: req.method,
    path: req.path,
    origin: origin || null,
    referer: referer || null,
    permitido: false,
    motivo: "Sin Origin/Referer",
  });
  if (intentos.length > 200) intentos.pop();
  return res.status(403).send(`
    <h2>🚫 Petición bloqueada</h2>
    <p><strong>Razón:</strong> No se detectaron cabeceras Origin ni Referer.</p>
    <p>Por seguridad, rechazamos peticiones sin información de origen.</p>
  `);
}

app.use(express.static(path.join(__dirname, "public")));

function cargarUsuarios() {
  try {
    return JSON.parse(fs.readFileSync(ARCHIVO_USUARIOS, "utf8"));
  } catch (e) {
    return { ana: { password: "contrasena", balance: 1000 } };
  }
}
function guardarUsuarios(usuarios) {
  fs.writeFileSync(ARCHIVO_USUARIOS, JSON.stringify(usuarios, null, 2));
}
let usuarios = cargarUsuarios();

app.get("/intentos.json", (req, res) => {
  res.json({ total: intentos.length, intentos });
});

app.get("/iniciar-sesion", (req, res) => {
  res.send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Iniciar sesión - Defensa 3: Headers</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light">
  <div class="container py-5">
    <div class="row justify-content-center">
      <div class="col-md-8">
        <div class="alert alert-info">
          <h5>📧 Defensa 3: Verificación de Cabeceras</h5>
          <p class="mb-0">El servidor verifica que las peticiones provengan del dominio correcto mediante Origin/Referer.</p>
        </div>
        <div class="card shadow-sm">
          <div class="card-body">
            <h3 class="card-title">Iniciar sesión</h3>
            <form method="POST" action="/iniciar-sesion">
              <div class="mb-3">
                <label class="form-label">Usuario</label>
                <input class="form-control" name="usuario" required />
              </div>
              <div class="mb-3">
                <label class="form-label">Contraseña</label>
                <input class="form-control" name="password" type="password" required />
              </div>
              <button class="btn btn-info">Entrar</button>
            </form>
          </div>
        </div>
        <div class="card mt-3">
          <div class="card-body">
            <h6>🔍 Cómo funciona:</h6>
            <ol class="small mb-0">
              <li><strong>Navegador envía cabecera Origin</strong> con cada petición cross-site</li>
              <li><strong>Servidor verifica:</strong> ¿El Origin coincide con mi dominio?</li>
              <li><strong>Si es diferente:</strong> Rechaza con 403 Forbidden</li>
              <li><strong>También verifica Referer</strong> como respaldo</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`);
});

app.post("/iniciar-sesion", validarOrigenPeticion, (req, res) => {
  const { usuario, password } = req.body;
  if (!usuario || !password) return res.redirect("/iniciar-sesion");
  const u = usuarios[usuario];
  if (!u || u.password !== password) return res.send("Credenciales inválidas");
  req.session.usuario = usuario;
  res.redirect("/cuenta");
});

app.get("/cerrar-sesion", (req, res) => {
  req.session.destroy(() => res.send("Sesión cerrada"));
});

app.get("/cuenta", (req, res) => {
  if (!req.session || !req.session.usuario) {
    return res.send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Banco - Defensa Headers</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light">
  <div class="container py-5">
    <h1>Banco - Defensa 3: Verificación de Cabeceras</h1>
    <p>Por favor <a href="/iniciar-sesion">inicie sesión</a> para ver su cuenta.</p>
  </div>
</body>
</html>`);
  }
  const usuario = req.session.usuario;
  const balance = usuarios[usuario].balance;

  return res.send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Cuenta de ${usuario} - Defensa Headers</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-white">
  <nav class="navbar bg-info navbar-dark">
    <div class="container">
      <a class="navbar-brand" href="#">📧 Defensa 3: Origin/Referer</a>
      <div class="text-light">Usuario: ${usuario} | <a href="/cerrar-sesion" class="link-light">Cerrar sesión</a></div>
    </div>
  </nav>
  <div class="container py-5">
    <div class="row">
      <div class="col-md-6">
        <div class="card shadow-sm mb-3">
          <div class="card-body">
            <h4>Saldo: <strong>$${balance}</strong></h4>
            <p>Realice una transferencia.</p>
            <form action="/transferencia" method="POST">
              <div class="mb-3">
                <label class="form-label">Monto</label>
                <input class="form-control" name="monto" value="100" />
              </div>
              <div class="mb-3">
                <label class="form-label">Destino</label>
                <input class="form-control" name="destino" value="cuenta-amigo" />
              </div>
              <button class="btn btn-info">Transferir</button>
            </form>
          </div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="alert alert-info">
          <h6>📧 Verificación de cabeceras activa</h6>
          <p class="small mb-2">El servidor verifica automáticamente:</p>
          <ul class="small mb-0">
            <li><strong>Origin:</strong> ¿De qué sitio viene la petición?</li>
            <li><strong>Referer:</strong> ¿Cuál es la URL de origen?</li>
          </ul>
          <hr>
          <p class="small mb-0">Si una petición viene de <code>localhost:3001</code> (atacante), 
          será rechazada porque no coincide con <code>localhost:3030</code> (este servidor).</p>
        </div>
        <div class="alert alert-success">
          <p class="small mb-0"><strong>Prueba:</strong> El ataque desde <a href="http://localhost:3001" target="_blank">localhost:3001</a> 
          será <strong>bloqueado</strong> porque el Origin será diferente.</p>
        </div>
        <div class="card mt-3">
          <div class="card-body">
            <h6 class="mb-2">📈 Intentos recientes</h6>
            <p class="small mb-2">Total: ${intentos.length}</p>
            <a href="/intentos.json" target="_blank" class="btn btn-sm btn-outline-secondary">Ver detalles (JSON)</a>
          </div>
        </div>
      </div>
    </div>

    <div class="card mt-3">
      <div class="card-header bg-light">
        <h6 class="mb-0">🔍 Ejemplo de cabeceras HTTP</h6>
      </div>
      <div class="card-body">
        <p class="small mb-2"><strong>Petición legítima (desde este sitio):</strong></p>
        <pre class="bg-light p-2 rounded small">POST /transferencia HTTP/1.1
Host: localhost:3030
Origin: http://localhost:3030 ← ✅ Coincide con el host
Referer: http://localhost:3030/cuenta
Cookie: connect.sid=...</pre>

        <p class="small mb-2 mt-3"><strong>Petición maliciosa (desde atacante):</strong></p>
        <pre class="bg-light p-2 rounded small">POST /transferencia HTTP/1.1
Host: localhost:3030
Origin: http://localhost:3001 ← ❌ NO coincide (atacante)
Referer: http://localhost:3001/
Cookie: connect.sid=...</pre>
        <p class="small text-danger mb-0">→ Servidor rechaza con 403 Forbidden</p>
      </div>
    </div>
  </div>
</body>
</html>`);
});

app.post("/transferencia", validarOrigenPeticion, (req, res) => {
  if (!req.session || !req.session.usuario) {
    intentos.unshift({
      ts: new Date().toISOString(),
      method: req.method,
      path: req.path,
      origin: req.headers.origin || null,
      referer: req.headers.referer || null,
      permitido: false,
      motivo: "Sin sesión",
    });
    if (intentos.length > 200) intentos.pop();
    return res.status(401).send("No ha iniciado sesión");
  }
  const usuario = req.session.usuario;
  const monto = Number(req.body.monto || 0);
  const destino = req.body.destino || "desconocido";
  if (monto > 0 && usuarios[usuario].balance >= monto) {
    usuarios[usuario].balance -= monto;
    guardarUsuarios(usuarios);
    console.log(
      `✅ [Headers] Transferencia validada: $${monto} desde ${usuario} a ${destino}`
    );
    intentos.unshift({
      ts: new Date().toISOString(),
      method: req.method,
      path: req.path,
      origin: req.headers.origin || null,
      referer: req.headers.referer || null,
      permitido: true,
      motivo: "Transferencia legítima (origen válido)",
      monto,
      destino,
    });
    if (intentos.length > 200) intentos.pop();
    return res.send(
      `✅ Transferido $${monto} a ${destino}. Nuevo saldo: $${usuarios[usuario].balance}`
    );
  }
  res.status(400).send("Transferencia inválida");
});

app.get("/donar", (req, res) => {
  res.status(405).send("Método no permitido");
});

app.get("/", (req, res) => res.redirect("/cuenta"));

app.listen(3030, () =>
  console.log(
    "📧 Defensa 3 (Origin/Referer) escuchando en http://localhost:3030"
  )
);
