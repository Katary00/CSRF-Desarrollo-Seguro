const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const path = require("path");
const csurf = require("csurf");
const fs = require("fs");
const https = require("https");
const selfsigned = require("selfsigned");

const app = express();
const intentos = [];
const ARCHIVO_USUARIOS = path.join(__dirname, "usuarios.json");

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(
  session({
    secret: "demo-token-csrf",
    resave: false,
    saveUninitialized: true,
    // Para demostrar correctamente la defensa por TOKEN CSRF
    // Necesitamos que el navegador ENVÍE la cookie en peticiones cross-site.
    // Por eso usamos SameSite=None + Secure (HTTPS obligatorio).
    cookie: { secure: true, sameSite: "none" },
  })
);

// DEFENSA 1: Protección con Token Anti-CSRF
// El servidor genera un token único por sesión
// El cliente debe incluirlo en cada petición POST
const csrfProtection = csurf({ cookie: false });

function registrarIntento(req, detalles) {
  intentos.unshift({
    ts: new Date().toISOString(),
    ip: req.ip,
    method: req.method,
    path: req.path,
    origin: req.headers.origin || null,
    referer: req.headers.referer || null,
    ...detalles,
  });
  if (intentos.length > 200) intentos.pop();
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

app.get("/iniciar-sesion", csrfProtection, (req, res) => {
  res.send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Iniciar sesión - Defensa 1: Token CSRF</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light">
  <div class="container py-5">
    <div class="row justify-content-center">
      <div class="col-md-8">
        <div class="alert alert-success">
          <h5>🔐 Defensa 1: Token Anti-CSRF</h5>
          <p class="mb-0">Este servidor usa tokens únicos para validar que las peticiones provienen del sitio legítimo.</p>
        </div>
        <div class="card shadow-sm">
          <div class="card-body">
            <h3 class="card-title">Iniciar sesión</h3>
            <form method="POST" action="/iniciar-sesion">
              <!-- ⚡ Token CSRF oculto en el formulario -->
              <input type="hidden" name="_csrf" value="${req.csrfToken()}" />
              <div class="mb-3">
                <label class="form-label">Usuario</label>
                <input class="form-control" name="usuario" required />
              </div>
              <div class="mb-3">
                <label class="form-label">Contraseña</label>
                <input class="form-control" name="password" type="password" required />
              </div>
              <button class="btn btn-primary">Entrar</button>
            </form>
          </div>
        </div>
        <div class="card mt-3">
          <div class="card-body">
            <h6>🔍 Cómo funciona:</h6>
            <ol class="small mb-0">
              <li><strong>Servidor genera token único</strong> para cada sesión</li>
              <li><strong>Token se incluye en formularios</strong> como campo oculto</li>
              <li><strong>Servidor valida el token</strong> en cada petición POST</li>
              <li><strong>El atacante no puede obtener el token</strong> por la política Same-Origin</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`);
});

app.post("/iniciar-sesion", csrfProtection, (req, res) => {
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

app.get("/cuenta", csrfProtection, (req, res) => {
  if (!req.session || !req.session.usuario) {
    return res.send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Banco - Defensa Token CSRF</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light">
  <div class="container py-5">
    <h1>Banco - Defensa 1: Token CSRF</h1>
    <p>Por favor <a href="/iniciar-sesion">inicie sesión</a> para ver su cuenta.</p>
  </div>
</body>
</html>`);
  }
  const usuario = req.session.usuario;
  const balance = usuarios[usuario].balance;
  const tokenCsrf = req.csrfToken();

  return res.send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Cuenta de ${usuario} - Defensa Token</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-white">
  <nav class="navbar bg-success navbar-dark">
    <div class="container">
      <a class="navbar-brand" href="#">🔐 Defensa 1: Token CSRF</a>
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
              <!-- ⚡ Token CSRF incluido automáticamente -->
              <input type="hidden" name="_csrf" value="${tokenCsrf}" />
              <div class="mb-3">
                <label class="form-label">Monto</label>
                <input class="form-control" name="monto" value="100" />
              </div>
              <div class="mb-3">
                <label class="form-label">Destino</label>
                <input class="form-control" name="destino" value="cuenta-amigo" />
              </div>
              <button class="btn btn-success">Transferir</button>
            </form>
          </div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="alert alert-info">
          <h6>💡 Token CSRF en acción</h6>
          <p class="small mb-2">Cada formulario incluye un token único:</p>
          <code class="small">${tokenCsrf}</code>
          <hr>
          <p class="small mb-0"><strong>¿Por qué es seguro?</strong><br>
          El atacante no puede leer este token debido a la política Same-Origin del navegador.
          Sin el token correcto, el servidor rechazará la petición.</p>
        </div>
        <div class="alert alert-warning">
          <p class="small mb-0"><strong>Prueba:</strong> Intenta atacar desde <a href="http://localhost:3001" target="_blank">localhost:3001</a>. 
          El ataque fallará porque el atacante no puede obtener el token.</p>
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
  </div>
</body>
</html>`);
});

/**
 * Middleware que requiere autenticación
 * Si no hay sesión válida, responde con 401
 * Si hay sesión, continúa con la siguiente función
 */
app.post("/transferencia", csrfProtection, (req, res) => {
  if (!req.session || !req.session.usuario) {
    registrarIntento(req, {
      permitido: false,
      motivo: "Sin sesión (cookie no enviada)",
    });
    return res.status(401).send("No ha iniciado sesión");
  }
  const usuario = req.session.usuario;
  const monto = Number(req.body.monto || 0);
  const destino = req.body.destino || "desconocido";
  if (monto > 0 && usuarios[usuario].balance >= monto) {
    usuarios[usuario].balance -= monto;
    guardarUsuarios(usuarios);
    console.log(
      `✅ Transferencia validada con token CSRF: $${monto} desde ${usuario} a ${destino}`
    );
    registrarIntento(req, {
      permitido: true,
      motivo: "Transferencia legítima con token válido",
      monto,
      destino,
    });
    return res.send(
      `✅ Transferido $${monto} a ${destino}. Nuevo saldo: $${usuarios[usuario].balance}`
    );
  }
  res.status(400).send("Transferencia inválida");
});

// GET rechazado (no debe cambiar estado)
app.get("/donar", (req, res) => {
  registrarIntento(req, {
    permitido: false,
    motivo: "Intento de cambiar estado via GET bloqueado",
  });
  res.status(405).send("Método no permitido. Use POST con token CSRF.");
});

app.get("/", (req, res) => res.redirect("/cuenta"));

// Servir por HTTPS (requerido para Secure + SameSite=None)
const attrs = [{ name: "commonName", value: "localhost" }];
const pems = selfsigned.generate(attrs, { days: 365 });
https
  .createServer({ key: pems.private, cert: pems.cert }, app)
  .listen(3010, () => {
    console.log(
      "🔐 Defensa 1 (Token CSRF) escuchando en https://localhost:3010"
    );
  });

//  Manejo de errores CSRF para registrar intentos bloqueados
app.use((err, req, res, next) => {
  // csurf lanza ForbiddenError en ausencia/invalidación de token
  if (err && (err.code === "EBADCSRFTOKEN" || err.message?.includes("csrf"))) {
    registrarIntento(req, {
      permitido: false,
      motivo: "Token CSRF inválido o ausente",
    });
    return res.status(403).send("ForbiddenError: invalid csrf token");
  }
  next(err);
});
