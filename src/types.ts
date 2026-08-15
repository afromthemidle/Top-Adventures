export type Sport =
  | "Escalada / Bouldering"
  | "Senderismo / Trail"
  | "Surf"
  | "Ciclismo / MTB"
  | "Kayak / SUP"
  | "Ciclismo Cumbayá"
  | "Senderismo Cajas"
  | "Escalada Cojitambo"
  | "Actividad pasada/eliminada"
  | "Canopy / Zipline"
  | "Parapente";

export interface UserProfile {
  name: string;
  city: string;
  interests: Sport[];
  contactMethod?: "email";
  contactValue?: string;
}

export interface AdventureTemplate {
  id: string;
  sport: Sport;
  city: string;
  date: Date;
  availableDates?: Date[];
  time: string;
  meetingPointName: string;
  meetingPointAddress: string;
  requiredGear: string[];
  slotsTotal: number;
  slotsAvailable: number;
  image: string;
  duration?: string;
  itinerary?: string[];
  description?: string;
  activityCost?: string;
  internalCostPerPerson?: number;
}

export interface Participant {
  id: string;
  name: string;
  avatarUrl: string;
  bio: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  text: string;
  timestamp: Date;
}

export interface Adventure {
  image?: string;
  id: string;
  activityId?: string;
  city: string;
  date: Date;
  time: string;
  sport: Sport;
  meetingPoint: {
    name: string;
    address: string;
  };
  requiredGear: string[];
  duration?: string;
  itinerary?: string[];
  description?: string;
  activityCost?: string;
  safetyTips?: string[];
  status?: "PENDING" | "PAID" | "REJECTED";
  paymentMethod?: "paypal" | "transfer";
  participants: Participant[];
  messages: ChatMessage[];
}
