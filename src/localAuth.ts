export type LocalUser = {
  uid: string;
  email: string;
  displayName: string;
};

type LocalAccount = LocalUser & { password: string };

const accountsKey = 'top-adventures.accounts.v1';
const sessionKey = 'top-adventures.session.v1';

const readAccounts = (): LocalAccount[] => {
  try {
    return JSON.parse(localStorage.getItem(accountsKey) || '[]');
  } catch {
    return [];
  }
};

const saveSession = (user: LocalUser) => localStorage.setItem(sessionKey, JSON.stringify(user));

export const localCurrentUser = (): LocalUser | null => {
  try {
    return JSON.parse(localStorage.getItem(sessionKey) || 'null');
  } catch {
    return null;
  }
};

export const registerLocal = async (email: string, password: string) => {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes('@')) throw new Error('Ingresa un correo válido.');
  if (password.length < 6) throw new Error('La contraseña debe tener al menos 6 caracteres.');
  const accounts = readAccounts();
  if (accounts.some(account => account.email === normalizedEmail)) throw new Error('Ya existe una cuenta con este correo.');
  const user: LocalUser = { uid: `local_${crypto.randomUUID()}`, email: normalizedEmail, displayName: 'Aventurero' };
  localStorage.setItem(accountsKey, JSON.stringify([...accounts, { ...user, password }]));
  saveSession(user);
  return { user };
};

export const loginLocal = async (email: string, password: string) => {
  const normalizedEmail = email.trim().toLowerCase();
  const account = readAccounts().find(item => item.email === normalizedEmail && item.password === password);
  if (!account) throw new Error('Correo o contraseña incorrectos.');
  const user: LocalUser = { uid: account.uid, email: account.email, displayName: account.displayName };
  saveSession(user);
  return { user };
};

export const logoutLocal = () => localStorage.removeItem(sessionKey);
