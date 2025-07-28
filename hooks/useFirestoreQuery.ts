import { useState, useEffect } from 'react';
import { Query, onSnapshot, DocumentData, QuerySnapshot, FirestoreError, DocumentReference, DocumentSnapshot } from '@firebase/firestore';

interface FirestoreQueryState<T> {
  data: T[] | null;
  loading: boolean;
  error: Error | null;
}

export const useFirestoreQuery = <T extends DocumentData>(query: Query | null): FirestoreQueryState<T> => {
  const [state, setState] = useState<FirestoreQueryState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    // If the query is null (e.g., user is logged out), don't run.
    if (!query) {
      setState({ data: [], loading: false, error: null });
      return;
    }

    setState(prevState => ({ ...prevState, loading: true }));

    const unsubscribe = onSnapshot(
      query,
      {
        next: (snapshot: QuerySnapshot<DocumentData>) => {
          const data: T[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          } as unknown as T));
          setState({ data, loading: false, error: null });
        },
        error: (error: FirestoreError) => {
          console.error("Firestore query error:", error);
          if (error.code === 'permission-denied') {
            console.error("DICA: Este é um erro de PERMISSÃO. Verifique se a sua consulta no código frontend corresponde exatamente às suas Regras de Segurança do Firestore (firestore.rules). Isto também pode ser causado pela falta de um índice composto necessário para a consulta.");
          }
          setState({ data: null, loading: false, error: new Error(`[${error.code}] ${error.message}`) });
        }
      }
    );

    // Unsubscribe from the listener when the component unmounts or the query changes
    return () => unsubscribe();
  }, [query]); // Re-run if query object instance changes. Caller must memoize.

  return state;
};

interface FirestoreDocumentState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export const useFirestoreDocument = <T extends DocumentData>(docRef: DocumentReference | null): FirestoreDocumentState<T> => {
  const [state, setState] = useState<FirestoreDocumentState<T>>({
    data: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    if (!docRef) {
      setState({ data: null, loading: false, error: null });
      return;
    }

    setState(prevState => ({ ...prevState, loading: true }));

    const unsubscribe = onSnapshot(
      docRef,
      (snapshot: DocumentSnapshot<DocumentData>) => {
        if (snapshot.exists()) {
          const data = {
            id: snapshot.id,
            ...snapshot.data(),
          } as unknown as T;
          setState({ data, loading: false, error: null });
        } else {
          setState({ data: null, loading: false, error: new Error('O documento não existe.') });
        }
      },
      (error: FirestoreError) => {
        console.error("Firestore document error:", error);
        setState({ data: null, loading: false, error: new Error(`[${error.code}] ${error.message}`) });
      }
    );

    return () => unsubscribe();
  }, [docRef]);

  return state;
};