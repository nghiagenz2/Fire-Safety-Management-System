const express = require('express');
const {
  getAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  assignRole,
  setLock,
  deleteAccount,
  getRoles
} = require('../controllers/accounts.controller');

const router = express.Router();

router.get('/', getAccounts);
router.get('/roles', getRoles);
router.get('/:id', getAccountById);
router.post('/', createAccount);
router.put('/:id', updateAccount);
router.patch('/:id/role', assignRole);
router.patch('/:id/lock', setLock);
router.delete('/:id', deleteAccount);

module.exports = router;
