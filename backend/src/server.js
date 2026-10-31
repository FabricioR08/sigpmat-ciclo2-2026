require('dotenv').config();
const app = require('./app');

if (!process.env.JWT_SECRET) {
  console.error('Falta JWT_SECRET en el archivo .env');
  process.exit(1);
}

const puerto = process.env.PORT || 3000;
app.listen(puerto, () => console.log(`SIGPMAT API escuchando en http://localhost:${puerto}`));
