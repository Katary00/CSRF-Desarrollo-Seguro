const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const path = require("path");
const fs = require("fs");

const app = express();
const ARCHIVO_USUARIOS = path.join(__dirname, "usuarios.json");
const intentos = [];

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(
  session({
    secret: "demo-inseguro",
    resave: false,
    saveUninitialized: true,
    // Vulnerable on purpose: no SameSite set
    cookie: { secure: false },
  })
);

app.use(express.static(path.join(__dirname, "public")));

// Cargar/guardar usuarios del archivo
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

app.get("/intentos.json", (req, res) => {
  res.json({ total: intentos.length, intentos });
});

function requiereAutenticacion(req, res, next) {
  if (!req.session || !req.session.usuario) {
    return res
      .status(401)
      .send("No ha iniciado sesión. Por favor, inicie sesión.");
  }
  next();
}

app.get("/iniciar-sesion", (req, res) => {
  res.send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Iniciar sesión - Banco (Vulnerable)</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light">
  <div class="container py-5">
    <div class="row justify-content-center">
      <div class="col-md-6">
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
              <button class="btn btn-primary">Entrar</button>
            </form>
          </div>
        </div>
        <p class="text-muted mt-3">Esta versión es intencionadamente vulnerable a CSRF para propósitos educativos; no la despliegues en producción.</p>
      </div>
    </div>
  </div>
</body>
</html>`);
});

app.post("/iniciar-sesion", (req, res) => {
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
  <title>Banco (Vulnerable)</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light">
  <div class="container py-5">
    <h1>Banco - Demo vulnerable</h1>
    <p>Por favor <a href="/iniciar-sesion">inicie sesión</a> para ver su cuenta.</p>
    <p class="text-warning">Nota: esta demo carece de protecciones CSRF. Si inicia sesión y visita una página maliciosa, su cuenta puede ser modificada.</p>
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
  <title>Cuenta de ${usuario}</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-white">
  <nav class="navbar bg-dark navbar-dark">
    <div class="container">
      <a class="navbar-brand" href="#">Banco (Vulnerable)</a>
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
                <input class="form-control" name="destino" value="cuenta-atacante" />
              </div>
              <button class="btn btn-danger">Transferir</button>
            </form>
          </div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="alert alert-info">Esta aplicación es vulnerable a CSRF. Pruebe abrir la página atacante en otra pestaña y haga la demostración.</div>
        <div class="card mt-3">
          <div class="card-body">
            <h6 class="mb-2">📈 Intentos recientes (vulnerable)</h6>
            <p class="small mb-2">Total: ${intentos.length}</p>
            <a href="/intentos.json" target="_blank" class="btn btn-sm btn-outline-secondary">Ver detalles (JSON)</a>
            <p class="small text-muted mb-0 mt-2">Si no ves la petición en DevTools, revisa aquí o activa "Preserve log" en Network.</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`);
});

app.post("/transferencia", requiereAutenticacion, (req, res) => {
  const usuario = req.session.usuario; // Mostramos buena práctica: se usa la sesión para identificar al remitente
  const monto = Number(req.body.monto || 0);
  const destino = req.body.destino || "desconocido";
  if (monto > 0 && usuarios[usuario].balance >= monto) {
    usuarios[usuario].balance -= monto;
    guardarUsuarios(usuarios);
    console.log(`Transferido $${monto} desde ${usuario} a ${destino}`);
    registrarIntento(req, {
      permitido: true,
      motivo: "POST transferencia procesada (sin protección CSRF)",
      monto,
      destino,
    });
    return res.send(
      `Transferido $${monto} a ${destino}. Nuevo saldo: $${usuarios[usuario].balance}`
    );
  }
  registrarIntento(req, {
    permitido: false,
    motivo:
      "POST transferencia rechazada (saldo insuficiente o monto inválido)",
    monto,
    destino,
  });
  res.status(400).send("Transferencia inválida");
});

// Ruta insegura (GET que cambia estado) para demostrar ataques por imagen/etiquetas
app.get("/donar", (req, res) => {
  if (!req.session || !req.session.usuario)
    return res.status(401).send("No ha iniciado sesión");
  const usuario = req.session.usuario;
  const monto = Number(req.query.monto || 0);
  const destino = req.query.destino || "desconocido";
  if (monto > 0 && usuarios[usuario].balance >= monto) {
    usuarios[usuario].balance -= monto;
    guardarUsuarios(usuarios);
    console.log(`(donar GET) ${usuario} -> ${destino} $${monto}`);
    registrarIntento(req, {
      permitido: true,
      motivo: "GET vulnerable cambió estado",
      monto,
      destino,
    });
    return res.send(
      `Donado $${monto} a ${destino}. Nuevo saldo: $${usuarios[usuario].balance}`
    );
  }
  registrarIntento(req, {
    permitido: false,
    motivo: "GET vulnerable rechazado (saldo insuficiente o monto inválido)",
    monto,
    destino,
  });
  res.status(400).send("Donación inválida");
});

app.get("/", (req, res) => res.redirect("/cuenta"));

app.listen(3000, () =>
  console.log("Aplicación vulnerable escuchando en http://localhost:3000")
);
