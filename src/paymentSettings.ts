import { doc, getDoc, onSnapshot, setDoc } from "firebase/firestore";
import { db } from "./firebase";

export type PaymentSettings = { paypal: boolean; transfer: boolean };
export const defaultPaymentSettings: PaymentSettings = { paypal: true, transfer: true };
const settingsRef = doc(db, "settings", "paymentMethods");

export const readPaymentSettings = async (): Promise<PaymentSettings> => {
  const snapshot = await getDoc(settingsRef);
  return { ...defaultPaymentSettings, ...(snapshot.data() as Partial<PaymentSettings> | undefined) };
};

export const subscribePaymentSettings = (onChange: (settings: PaymentSettings) => void) =>
  onSnapshot(settingsRef, (snapshot) =>
    onChange({ ...defaultPaymentSettings, ...(snapshot.data() as Partial<PaymentSettings> | undefined) }),
  );

export const savePaymentSettings = (settings: PaymentSettings) => setDoc(settingsRef, settings, { merge: true });
