import { Router } from 'express';
const router = Router();

router.get('/', (req, res) => {
  res.send('x-o-battleground webSocket server is running.');
});

export default router;
