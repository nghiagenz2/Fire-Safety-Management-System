const accountsService = require('../services/accounts.service');

async function getAccounts(req, res, next) {
  try {
    const accounts = await accountsService.getAccounts(req.query);
    res.status(200).json({ success: true, data: accounts });
  } catch (error) {
    next(error);
  }
}

async function getAccountById(req, res, next) {
  try {
    const account = await accountsService.getAccountById(req.params.id);
    if (!account) {
      res.status(404);
      throw new Error('Account not found');
    }

    res.status(200).json({ success: true, data: account });
  } catch (error) {
    next(error);
  }
}

async function createAccount(req, res, next) {
  try {
    const account = await accountsService.createAccount(req.body);
    res.status(201).json({ success: true, data: account });
  } catch (error) {
    next(error);
  }
}

async function updateAccount(req, res, next) {
  try {
    const account = await accountsService.updateAccount(req.params.id, req.body);
    if (!account) {
      res.status(404);
      throw new Error('Account not found');
    }

    res.status(200).json({ success: true, data: account });
  } catch (error) {
    next(error);
  }
}

async function assignRole(req, res, next) {
  try {
    const account = await accountsService.assignRole(req.params.id, req.body.role);
    if (!account) {
      res.status(404);
      throw new Error('Account not found');
    }

    res.status(200).json({ success: true, data: account });
  } catch (error) {
    next(error);
  }
}

async function setLock(req, res, next) {
  try {
    const account = await accountsService.setLock(req.params.id, Boolean(req.body.shouldLock));
    if (!account) {
      res.status(404);
      throw new Error('Account not found');
    }

    res.status(200).json({ success: true, data: account });
  } catch (error) {
    next(error);
  }
}

async function deleteAccount(req, res, next) {
  try {
    const deleted = await accountsService.deleteAccount(req.params.id);
    if (!deleted) {
      res.status(404);
      throw new Error('Account not found');
    }

    res.status(200).json({ success: true, data: { id: req.params.id } });
  } catch (error) {
    next(error);
  }
}

async function getRoles(req, res, next) {
  try {
    res.status(200).json({ success: true, data: accountsService.getRoles() });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  getAccounts,
  getAccountById,
  createAccount,
  updateAccount,
  assignRole,
  setLock,
  deleteAccount,
  getRoles
};
