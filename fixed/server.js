const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const path = require("path");
const csurf = require("csurf");
const fs = require("fs");

const app = express();
const ARCHIVO_USUARIOS = path.join(__dirname, "usuarios.json");

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(
  session({
    secret: "demo-seguro",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false, sameSite: "lax" },
  })
);

// Protección CSRF
const csrfProtection = csurf({ cookie: false });

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

app.get("/iniciar-sesion", csrfProtection, (req, res) => {
  res.send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Iniciar sesión - Banco (Protegido)</title>
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
        <p class="text-muted mt-3">Esta instancia incluye protecciones CSRF (token + SameSite).</p>
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
  <title>Banco (Protegido)</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light">
  <div class="container py-5">
    <h1>Banco - Protegido</h1>
    <p>Por favor <a href="/iniciar-sesion">inicie sesión</a> para ver su cuenta.</p>
    <p class="text-success">Esta instancia valida un token CSRF y usa SameSite en la cookie de sesión.</p>
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
  <title>Cuenta de ${usuario} (Protegido)</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-white">
  <nav class="navbar bg-dark navbar-dark">
    <div class="container">
      <a class="navbar-brand" href="#">Banco (Protegido)</a>
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
              <input type="hidden" name="_csrf" value="${req.csrfToken()}" />
              <div class="mb-3">
                <label class="form-label">Monto</label>
                <input class="form-control" name="monto" value="100" />
              </div>
              <div class="mb-3">
                <label class="form-label">Destino</label>
                <input class="form-control" name="destino" value="cuenta-amigo" />
              </div>
              <button class="btn btn-primary">Transferir</button>
            </form>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`);
});

app.post("/transferencia", csrfProtection, (req, res) => {
  if (!req.session || !req.session.usuario)
    return res.status(401).send("No ha iniciado sesión");
  const usuario = req.session.usuario;
  const monto = Number(req.body.monto || 0);
  const destino = req.body.destino || "desconocido";
  if (monto > 0 && usuarios[usuario].balance >= monto) {
    usuarios[usuario].balance -= monto;
    guardarUsuarios(usuarios);
    console.log(`Transferido $${monto} desde ${usuario} a ${destino}`);
    return res.send(
      `Transferido $${monto} a ${destino}. Nuevo saldo: $${usuarios[usuario].balance}`
    );
  }
  res.status(400).send("Transferencia inválida");
});

// Rechazamos GET que cambian estado en la app protegida
app.get("/donar", (req, res) => {
  res.status(405).send("Método no permitido");
});

app.get("/", (req, res) => res.redirect("/cuenta"));

app.listen(3002, () =>
  console.log("Aplicación protegida escuchando en http://localhost:3002")
);
