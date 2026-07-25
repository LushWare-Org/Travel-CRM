import app from './app.js';

const PORT = process.env.PORT || 3010;

app.listen(PORT, () => console.log(`Flight service running on port ${PORT}`));

