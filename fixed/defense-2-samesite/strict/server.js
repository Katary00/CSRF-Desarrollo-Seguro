const express = require("express");
const session = require("express-session");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const path = require("path");
const fs = require("fs");

const app = express();
const ARCHIVO_USUARIOS = path.join(__dirname, "usuarios.json");

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(
  session({
    secret: "demo-samesite-strict",
    resave: false,
    saveUninitialized: true,
    // ✅ DEFENSA 2A: SameSite=Strict (Bloqueo total)
    // Las cookies NO se envían en NINGUNA petición cross-site
    cookie: {
      secure: false, // En producción debe ser true (HTTPS)
      sameSite: "strict",
    },
  })
);

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

app.get("/iniciar-sesion", (req, res) => {
  res.send(`<!doctype html>
<html>
<head>
  <meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Iniciar sesión - SameSite=Strict</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light">
  <div class="container py-5">
    <div class="row justify-content-center">
      <div class="col-md-8">
        <div class="alert alert-danger">
          <h5>🔒 Defensa 2A: SameSite=Strict</h5>
          <p class="mb-0"><strong>Bloqueo total:</strong> Las cookies NO se envían en ninguna petición desde otro sitio.</p>
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
              <button class="btn btn-danger">Entrar</button>
            </form>
          </div>
        </div>
        <div class="card mt-3">
          <div class="card-body">
            <h6>🔍 SameSite=Strict:</h6>
            <ul class="small mb-0">
              <li><strong>✅ Protección máxima</strong> contra CSRF</li>
              <li><strong>❌ Enlaces externos</strong> no funcionarán con sesión (usuario debe iniciar sesión nuevamente)</li>
              <li><strong>Ejemplo:</strong> Si recibes un email con un enlace a este sitio, llegarás sin sesión iniciada</li>
              <li><strong>Uso ideal:</strong> Aplicaciones muy sensibles (bancos, sistemas críticos)</li>
            </ul>
          </div>
        </div>
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
  <title>Banco - SameSite Strict</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-light">
  <div class="container py-5">
    <h1>Banco - SameSite=Strict</h1>
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
  <title>Cuenta de ${usuario} - SameSite Strict</title>
  <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.min.css" rel="stylesheet">
</head>
<body class="bg-white">
  <nav class="navbar bg-danger navbar-dark">
    <div class="container">
      <a class="navbar-brand" href="#">🔒 Defensa 2A: SameSite=Strict</a>
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
              <button class="btn btn-danger">Transferir</button>
            </form>
          </div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="alert alert-danger">
          <h6>🔒 SameSite=Strict activado</h6>
          <p class="small mb-2">El navegador NO enviará la cookie de sesión en peticiones cross-site.</p>
          <hr>
          <p class="small mb-0"><strong>Prueba:</strong> Intenta atacar desde <a href="http://localhost:3001" target="_blank">localhost:3001</a>. 
          El ataque fallará porque el navegador no enviará la cookie.</p>
        </div>
      </div>
    </div>
  </div>
</body>
</html>`);
});

app.post("/transferencia", (req, res) => {
  if (!req.session || !req.session.usuario)
    return res.status(401).send("No ha iniciado sesión");
  const usuario = req.session.usuario;
  const monto = Number(req.body.monto || 0);
  const destino = req.body.destino || "desconocido";
  if (monto > 0 && usuarios[usuario].balance >= monto) {
    usuarios[usuario].balance -= monto;
    guardarUsuarios(usuarios);
    console.log(
      `✅ [Strict] Transferencia: $${monto} desde ${usuario} a ${destino}`
    );
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

app.listen(3020, () =>
  console.log(
    "🔒 Defensa 2A (SameSite=Strict) escuchando en http://localhost:3020"
  )
);
