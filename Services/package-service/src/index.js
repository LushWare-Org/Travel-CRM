import 'dotenv/config';
import app from './app.js';

const PORT = process.env.PORT || 3003;

app.listen(PORT, () => console.log(`Package service running on port ${PORT}`));
