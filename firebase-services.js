import { 
  collection, 
  addDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  where, 
  orderBy,
  onSnapshot 
} from "firebase/firestore";
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from "firebase/auth";
import { db, auth } from "./firebase-config.js";

// Authentication Services
export const authService = {
  // Sign up new user
  async signUp(email, password) {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      return { success: true, user: userCredential.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Sign in existing user
  async signIn(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      return { success: true, user: userCredential.user };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Sign out user
  async signOut() {
    try {
      await signOut(auth);
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Listen to auth state changes
  onAuthStateChange(callback) {
    return onAuthStateChanged(auth, callback);
  }
};

// Firestore Database Services
export const dbService = {
  // Generic function to add document to any collection
  async addDocument(collectionName, data) {
    try {
      const docRef = await addDoc(collection(db, collectionName), {
        ...data,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      return { success: true, id: docRef.id };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Generic function to get all documents from a collection
  async getDocuments(collectionName, userId = null) {
    try {
      let q = collection(db, collectionName);
      
      if (userId) {
        q = query(collection(db, collectionName), where("userId", "==", userId));
      }
      
      const querySnapshot = await getDocs(q);
      const documents = [];
      querySnapshot.forEach((doc) => {
        documents.push({ id: doc.id, ...doc.data() });
      });
      return { success: true, data: documents };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Generic function to update document
  async updateDocument(collectionName, docId, data) {
    try {
      const docRef = doc(db, collectionName, docId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: new Date()
      });
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Generic function to delete document
  async deleteDocument(collectionName, docId) {
    try {
      await deleteDoc(doc(db, collectionName, docId));
      return { success: true };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  // Real-time listener for collection changes
  subscribeToCollection(collectionName, callback, userId = null) {
    let q = collection(db, collectionName);
    
    if (userId) {
      q = query(collection(db, collectionName), where("userId", "==", userId));
    }
    
    return onSnapshot(q, (querySnapshot) => {
      const documents = [];
      querySnapshot.forEach((doc) => {
        documents.push({ id: doc.id, ...doc.data() });
      });
      callback(documents);
    });
  }
};

// CashBook specific services
export const cashBookService = {
  // Income entries
  async addIncomeEntry(userId, entry) {
    return await dbService.addDocument("income_entries", { ...entry, userId });
  },

  async getIncomeEntries(userId) {
    return await dbService.getDocuments("income_entries", userId);
  },

  // Expense entries
  async addExpenseEntry(userId, entry) {
    return await dbService.addDocument("expense_entries", { ...entry, userId });
  },

  async getExpenseEntries(userId) {
    return await dbService.getDocuments("expense_entries", userId);
  },

  // Bank entries
  async addBankEntry(userId, entry) {
    return await dbService.addDocument("bank_entries", { ...entry, userId });
  },

  async getBankEntries(userId) {
    return await dbService.getDocuments("bank_entries", userId);
  },

  // Cash entries
  async addCashEntry(userId, entry) {
    return await dbService.addDocument("cash_entries", { ...entry, userId });
  },

  async getCashEntries(userId) {
    return await dbService.getDocuments("cash_entries", userId);
  },

  // Customer entries
  async addCustomer(userId, customer) {
    return await dbService.addDocument("customers", { ...customer, userId });
  },

  async getCustomers(userId) {
    return await dbService.getDocuments("customers", userId);
  },

  // Real-time subscriptions
  subscribeToIncomeEntries(userId, callback) {
    return dbService.subscribeToCollection("income_entries", callback, userId);
  },

  subscribeToExpenseEntries(userId, callback) {
    return dbService.subscribeToCollection("expense_entries", callback, userId);
  },

  subscribeToCustomers(userId, callback) {
    return dbService.subscribeToCollection("customers", callback, userId);
  }
};

export default { authService, dbService, cashBookService };
