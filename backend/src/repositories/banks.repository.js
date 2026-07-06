import { query } from "../db/postgres.js";

const bankColumnMap = {
  name: "name",
  isActive: "is_active",
  sortOrder: "sort_order",
};

function mapBank(row) {
  if (!row) {
    return row;
  }

  return {
    id: row.id,
    name: row.name,
    isActive: row.is_active,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildUpdate(data) {
  const entries = Object.entries(data).filter(([field]) =>
    Object.prototype.hasOwnProperty.call(bankColumnMap, field)
  );

  if (entries.length === 0) {
    return null;
  }

  const sets = entries.map(([field], index) =>
    `${bankColumnMap[field]} = $${index + 1}`
  );
  const values = entries.map(([, value]) => value);

  return {
    setSql: `${sets.join(", ")}, updated_at = NOW()`,
    values,
  };
}

async function getActiveBanks() {
  const result = await query(
    `SELECT *
       FROM banks
      WHERE is_active = TRUE
      ORDER BY sort_order ASC, name ASC`,
  );

  return result.rows.map(mapBank);
}

async function getAllBanks() {
  const result = await query(
    `SELECT *
       FROM banks
      ORDER BY is_active DESC, sort_order ASC, name ASC`,
  );

  return result.rows.map(mapBank);
}

async function getBankById(id) {
  const result = await query(
    `SELECT *
       FROM banks
      WHERE id = $1`,
    [id],
  );

  return mapBank(result.rows[0]) || null;
}

async function getBankByName(name) {
  const result = await query(
    `SELECT *
       FROM banks
      WHERE lower(name) = lower($1)`,
    [name],
  );

  return mapBank(result.rows[0]) || null;
}

async function createBank(data) {
  const result = await query(
    `INSERT INTO banks (
        name,
        is_active,
        sort_order
      ) VALUES ($1, COALESCE($2, TRUE), COALESCE($3, 100))
      RETURNING *`,
    [data.name, data.isActive, data.sortOrder],
  );

  return mapBank(result.rows[0]);
}

async function updateBank(id, data) {
  const update = buildUpdate(data);
  if (!update) {
    return getBankById(id);
  }

  const result = await query(
    `UPDATE banks
        SET ${update.setSql}
      WHERE id = $${update.values.length + 1}
      RETURNING *`,
    [...update.values, id],
  );

  return mapBank(result.rows[0]) || null;
}

export {
  createBank,
  getActiveBanks,
  getAllBanks,
  getBankById,
  getBankByName,
  updateBank,
};
