  // api/cron.js
  import { setupCartCleanupJob } from '../jobs/cartCleanup.js';

  export default function handler(req, res) {
    setupCartCleanupJob();
    res.status(200).send('Cart cleanup job executed');
  }
