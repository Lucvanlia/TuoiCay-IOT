/// <reference types="vite/client" />

declare module 'firebase/app' {
  export function initializeApp(config: any): any;
  export function getApps(): any[];
  export function getApp(): any;
}

declare module 'firebase/database' {
  export function getDatabase(app?: any): any;
  export function ref(db: any, path: string): any;
  export function onValue(ref: any, callback: (snapshot: any) => void, cancelCallback?: (error: any) => void): () => void;
  export function off(ref: any): void;
  export function set(ref: any, value: any): Promise<void>;
  export function update(ref: any, value: any): Promise<void>;
  export function push(ref: any, value?: any): any;
  export function query(ref: any, ...queryConstraints: any[]): any;
  export function limitToLast(limit: number): any;
}

declare module 'firebase/auth' {
  export interface User {
    uid: string;
    email: string | null;
    displayName: string | null;
    photoURL: string | null;
  }
  export function getAuth(app?: any): any;
  export class GoogleAuthProvider {}
  export function signInWithPopup(auth: any, provider: any): Promise<{ user: User }>;
  export function signOut(auth: any): Promise<void>;
  export function onAuthStateChanged(auth: any, callback: (user: User | null) => void): () => void;
}

declare module 'firebase/analytics' {
  export function getAnalytics(app?: any): any;
}
