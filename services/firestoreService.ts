import { 
  collection, 
  addDoc, 
  serverTimestamp, 
  doc, 
  updateDoc,
  deleteDoc,
  query,
  where,
  getDocs,
  getDoc,
  writeBatch,
  arrayUnion,
  arrayRemove,
  setDoc,
  deleteField,
  runTransaction,
  Timestamp,
  collectionGroup
} from "@firebase/firestore";
import { getStorage, ref, uploadBytesResumable, getDownloadURL } from "@firebase/storage";
import { auth, db } from '../firebase/config';
import { Project, Task, UserSummary, Comment, User, Module, Entity, Relationship, Notification, Invitation, MemberRole, Member, Credential, TaskLink, TaskStatus } from '../types';
import { getSeedData } from "../utils/seed";

// --- User Profile Functions ---

export const uploadAvatar = (
  uid: string,
  file: File,
  onProgress: (progress: number) => void
): Promise<string> => {
  const storage = getStorage();
  return new Promise((resolve, reject) => {
    const filePath = `avatars/${uid}/${Date.now()}-${file.name}`;
    const storageRef = ref(storage, filePath);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
        onProgress(progress);
      },
      (error) => {
        console.error("Avatar upload failed:", error);
        reject(error);
      },
      async () => {
        const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
        resolve(downloadURL);
      }
    );
  });
};


// --- Notification Functions ---

export const sendNotification = async (userId: string, notificationData: Omit<Notification, 'id' | 'isRead' | 'createdAt'>) => {
    if (!userId) return;
    const notificationsRef = collection(db, 'users', userId, 'notifications');
    await addDoc(notificationsRef, {
        ...notificationData,
        isRead: false,
        createdAt: serverTimestamp()
    });
};

export const markNotificationAsRead = async (notificationId: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");
    const notificationRef = doc(db, 'users', user.uid, 'notifications', notificationId);
    await updateDoc(notificationRef, { isRead: true });
};


// --- Project and Member/Invitation Functions ---

export const createProject = async (name: string, description: string, user: User) => {
    // A user must have a UID to be a project owner and member.
    if (!user || !user.uid) {
      throw new Error("Um usuário autenticado e válido é necessário para criar um projeto.");
    }
  
    // Construct the project data, ensuring the creator is the owner and a member.
    // This is critical for security rules that check the 'memberUids' array.
    const projectPayload = {
      name,
      description,
      ownerId: user.uid,
      members: { [user.uid]: 'owner' },
      memberUids: [user.uid],
      createdAt: serverTimestamp(),
    };
  
    const docRef = await addDoc(collection(db, "projects"), projectPayload);
    return docRef.id;
};

export const updateProject = async (projectId: string, data: Partial<Pick<Project, 'name' | 'description'>>) => {
    const projectRef = doc(db, "projects", projectId);
    await updateDoc(projectRef, data);
};

export const deleteProject = async (projectId: string) => {
    const projectRef = doc(db, "projects", projectId);
    await deleteDoc(projectRef);
};

export const sendProjectInvitation = async (project: Project, recipientEmail: string, role: MemberRole) => {
    const inviter = auth.currentUser;
    if (!inviter) throw new Error("Usuário não autenticado");
    if (inviter.email === recipientEmail) throw new Error("Você não pode convidar a si mesmo.");

    // 1. Check if recipient user exists
    const usersRef = collection(db, 'users');
    const userQuery = query(usersRef, where('email', '==', recipientEmail));
    const userSnap = await getDocs(userQuery);
    if (userSnap.empty) {
        throw new Error(`Usuário com o e-mail "${recipientEmail}" não encontrado.`);
    }
    const recipientUser = userSnap.docs[0].data() as User;

    // 2. Check if user is already a member
    if (project.memberUids.includes(recipientUser.uid)) {
        throw new Error("Este usuário já é membro do projeto.");
    }
    
    // 3. Check for existing pending invitation
    const invitationsRef = collection(db, 'invitations');
    const inviteQuery = query(invitationsRef, where('projectId', '==', project.id), where('recipientEmail', '==', recipientEmail), where('status', '==', 'pending'));
    const inviteSnap = await getDocs(inviteQuery);
    if (!inviteSnap.empty) {
        throw new Error("Um convite já foi enviado para este endereço de e-mail.");
    }

    // 4. Create invitation
    const invitationData: Omit<Invitation, 'id'> = {
        recipientEmail,
        projectId: project.id,
        projectName: project.name,
        role,
        inviter: {
            uid: inviter.uid,
            name: inviter.displayName,
        },
        status: 'pending',
        createdAt: serverTimestamp() as any
    };

    await addDoc(invitationsRef, invitationData);
};

export const acceptInvitation = async (invitation: Invitation) => {
    const user = auth.currentUser;
    if (!user || !user.email) throw new Error("Usuário não autenticado");
    
    const invitationRef = doc(db, 'invitations', invitation.id);
    const projectRef = doc(db, 'projects', invitation.projectId);

    const batch = writeBatch(db);
    batch.update(projectRef, { 
        [`members.${user.uid}`]: invitation.role,
        memberUids: arrayUnion(user.uid)
    });
    batch.update(invitationRef, { status: 'accepted' });
    await batch.commit();
};

export const declineInvitation = async (invitationId: string) => {
    const invitationRef = doc(db, 'invitations', invitationId);
    await updateDoc(invitationRef, { status: 'declined' });
};

export const cancelInvitation = async (invitationId: string) => {
    const invitationRef = doc(db, 'invitations', invitationId);
    await deleteDoc(invitationRef);
}

export const updateMemberRole = async (projectId: string, memberUid: string, newRole: MemberRole) => {
    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, {
        [`members.${memberUid}`]: newRole
    });
};

export const removeMemberFromProject = async (projectId: string, memberUid: string) => {
    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, {
        [`members.${memberUid}`]: deleteField(),
        memberUids: arrayRemove(memberUid)
    });
};

// --- Task Functions ---
export const createTask = async (projectId: string, projectName: string, taskData: Partial<Pick<Task, 'title' | 'description' | 'assignee' | 'moduleId' | 'relatedEntityIds' | 'dueDate'>>) => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");

    const tasksRef = collection(db, 'projects', projectId, 'tasks');
    
    // Base payload with fields that are always required or have a default.
    const payload = {
        projectId,
        title: '',
        description: '',
        status: 'todo' as const,
        assignee: null,
        dueDate: null,
        commentsCount: 0,
        dependsOn: [],
        relatedEntityIds: [],
        timeLogs: [],
        links: [],
        ...taskData, // Spread the provided data. This will overwrite defaults and add optional fields like moduleId if they exist.
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
    };
    
    const docRef = await addDoc(tasksRef, payload);

    // Update entity relationships
    if (taskData.relatedEntityIds && taskData.relatedEntityIds.length > 0) {
        const batch = writeBatch(db);
        taskData.relatedEntityIds.forEach(entityId => {
            const entityRef = doc(db, 'projects', projectId, 'entities', entityId);
            batch.update(entityRef, { relatedTaskIds: arrayUnion(docRef.id) });
        });
        await batch.commit();
    }
    
    // Send notification if assigned to someone else
    if (taskData.assignee && taskData.assignee.uid !== user.uid) {
        await sendNotification(taskData.assignee.uid, {
            type: 'task_assigned',
            message: `${user.displayName} te atribuiu à tarefa "${taskData.title}".`,
            related: { projectId, taskId: docRef.id, projectName },
            sender: { name: user.displayName || 'Alguém', photoURL: user.photoURL },
        });
    }
};

export const updateTask = async (projectId: string, taskId: string, data: Partial<Task>) => {
    const taskRef = doc(db, 'projects', projectId, 'tasks', taskId);
    await updateDoc(taskRef, { ...data, updatedAt: serverTimestamp() });
};

export const deleteTask = async (projectId: string, taskId: string) => {
    const taskRef = doc(db, 'projects', projectId, 'tasks', taskId);
    await deleteDoc(taskRef);
    // In a real app, you might want to also delete subcollections like comments recursively via a cloud function.
};

export const addTaskComment = async (
    projectId: string, 
    projectName: string, 
    taskId: string, 
    taskTitle: string, 
    content: string, 
    projectMembers: Member[]
) => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");

    const userSummary: UserSummary = {
        uid: user.uid,
        displayName: user.displayName,
        photoURL: user.photoURL,
    };
    
    await runTransaction(db, async (transaction) => {
        const taskRef = doc(db, 'projects', projectId, 'tasks', taskId);
        const commentsRef = collection(db, 'projects', projectId, 'tasks', taskId, 'comments');
        
        const taskDoc = await transaction.get(taskRef);
        if (!taskDoc.exists()) throw new Error("Tarefa não encontrada.");

        const commentsCount = (taskDoc.data().commentsCount || 0) + 1;
        transaction.update(taskRef, { commentsCount });

        const newCommentRef = doc(commentsRef);
        transaction.set(newCommentRef, {
            author: userSummary,
            content,
            createdAt: serverTimestamp(),
        });
        
        // Handle mentions
        const mentions = content.match(/@(\w+)/g) || [];
        if (mentions.length > 0) {
            const mentionedNames = mentions.map(m => m.substring(1));
            const membersToNotify = projectMembers.filter(m => 
                m.displayName && mentionedNames.includes(m.displayName) && m.uid !== user.uid
            );

            for (const member of membersToNotify) {
                await sendNotification(member.uid, {
                    type: 'comment_mention',
                    message: `${user.displayName} mencionou você na tarefa "${taskTitle}".`,
                    related: { projectId, taskId, projectName },
                    sender: { name: user.displayName, photoURL: user.photoURL }
                });
            }
        }
    });
};

export const addLinkToTask = async (projectId: string, taskId: string, link: TaskLink) => {
    const taskRef = doc(db, 'projects', projectId, 'tasks', taskId);
    await updateDoc(taskRef, { links: arrayUnion(link) });
};

export const removeLinkFromTask = async (projectId: string, taskId: string, link: TaskLink) => {
    const taskRef = doc(db, 'projects', projectId, 'tasks', taskId);
    await updateDoc(taskRef, { links: arrayRemove(link) });
};

export const updateLinkInTask = async (projectId: string, taskId: string, updatedLink: TaskLink) => {
    const taskRef = doc(db, 'projects', projectId, 'tasks', taskId);
    await runTransaction(db, async (transaction) => {
        const taskDoc = await transaction.get(taskRef);
        if (!taskDoc.exists()) throw new Error("Tarefa não encontrada.");
        
        const links = (taskDoc.data().links || []) as TaskLink[];
        const linkIndex = links.findIndex(l => l.id === updatedLink.id);
        
        if (linkIndex > -1) {
            links[linkIndex] = updatedLink;
            transaction.update(taskRef, { links });
        } else {
            throw new Error("Link não encontrado para atualizar.");
        }
    });
};

// --- Timer Functions ---

export const startTimer = async (taskId: string, projectId: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");

    const userRef = doc(db, 'users', user.uid);
    const userDoc = await getDoc(userRef);

    if (userDoc.exists() && userDoc.data().activeTimer) {
        throw new Error("Você já tem um contador ativo em outra tarefa.");
    }
    
    await updateDoc(userRef, {
        activeTimer: {
            projectId,
            taskId,
            startTime: serverTimestamp(),
        }
    });
};

export const stopTimer = async () => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");

    await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', user.uid);
        const userDoc = await transaction.get(userRef);

        if (!userDoc.exists() || !userDoc.data().activeTimer) {
            return; // No active timer, nothing to do.
        }

        const { projectId, taskId, startTime } = userDoc.data().activeTimer;
        const taskRef = doc(db, 'projects', projectId, 'tasks', taskId);
        
        const now = Timestamp.now();
        const durationInSeconds = now.seconds - (startTime as Timestamp).seconds;
        
        if (durationInSeconds > 0) {
            const timeLog = {
                userId: user.uid,
                durationInSeconds,
                loggedAt: now,
            };
            transaction.update(taskRef, { timeLogs: arrayUnion(timeLog) });
        }
        
        transaction.update(userRef, { activeTimer: deleteField() });
    });
};


// --- Module Functions ---
export const createModule = async (projectId: string, moduleData: Pick<Module, 'name'|'description'|'relatedEntityIds' | 'icon' | 'color'>, documentation: string) => {
    const batch = writeBatch(db);
    const moduleRef = doc(collection(db, 'projects', projectId, 'modules'));
    
    batch.set(moduleRef, {
        ...moduleData,
        projectId,
        createdAt: serverTimestamp(),
    });

    const docRef = doc(collection(db, 'projects', projectId, 'modules', moduleRef.id, 'documentation'));
    batch.set(docRef, { content: documentation, updatedAt: serverTimestamp() });
    
    if(moduleData.relatedEntityIds && moduleData.relatedEntityIds.length > 0) {
        moduleData.relatedEntityIds.forEach(entityId => {
            const entityRef = doc(db, 'projects', projectId, 'entities', entityId);
            batch.update(entityRef, { relatedModuleIds: arrayUnion(moduleRef.id) });
        });
    }

    await batch.commit();
};

export const updateModule = async (projectId: string, moduleId: string, moduleData: Partial<Module>, documentation: string) => {
    const batch = writeBatch(db);
    const moduleRef = doc(db, 'projects', projectId, 'modules', moduleId);
    
    const oldModuleDoc = await getDoc(moduleRef);
    if (!oldModuleDoc.exists()) throw new Error("Módulo não encontrado.");

    const oldRelatedEntityIds = oldModuleDoc.data().relatedEntityIds || [];
    const newRelatedEntityIds = moduleData.relatedEntityIds || [];

    const idsToAdd = newRelatedEntityIds.filter(id => !oldRelatedEntityIds.includes(id));
    const idsToRemove = oldRelatedEntityIds.filter(id => !newRelatedEntityIds.includes(id));

    batch.update(moduleRef, moduleData);

    const docQuery = query(collection(db, 'projects', projectId, 'modules', moduleId, 'documentation'));
    const docSnap = await getDocs(docQuery);
    if (docSnap.empty) {
        const newDocRef = doc(collection(db, 'projects', projectId, 'modules', moduleId, 'documentation'));
        batch.set(newDocRef, { content: documentation, updatedAt: serverTimestamp() });
    } else {
        const docRef = docSnap.docs[0].ref;
        batch.update(docRef, { content: documentation, updatedAt: serverTimestamp() });
    }

    idsToAdd.forEach(entityId => {
        const entityRef = doc(db, 'projects', projectId, 'entities', entityId);
        batch.update(entityRef, { relatedModuleIds: arrayUnion(moduleId) });
    });

    idsToRemove.forEach(entityId => {
        const entityRef = doc(db, 'projects', projectId, 'entities', entityId);
        batch.update(entityRef, { relatedModuleIds: arrayRemove(moduleId) });
    });

    await batch.commit();
};

export const deleteModule = async (projectId: string, moduleId: string) => {
    const moduleRef = doc(db, 'projects', projectId, 'modules', moduleId);
    // Note: This does not delete subcollections. A robust solution would use a cloud function.
    await deleteDoc(moduleRef);
};

export const getModuleDocumentation = async (projectId: string, moduleId: string): Promise<string> => {
    const docQuery = query(collection(db, 'projects', projectId, 'modules', moduleId, 'documentation'));
    const docSnap = await getDocs(docQuery);
    if (!docSnap.empty) {
        return docSnap.docs[0].data().content || '';
    }
    return '';
};


// --- Entity & Relationship Functions ---
export const createEntity = async (projectId: string, entityData: Pick<Entity, 'name' | 'description' | 'attributes' | 'relatedModuleIds' | 'relatedTaskIds'>) => {
    await addDoc(collection(db, 'projects', projectId, 'entities'), {
        ...entityData,
        projectId,
        createdAt: serverTimestamp()
    });
};

export const updateEntity = async (projectId: string, entityId: string, entityData: Partial<Entity>) => {
    const entityRef = doc(db, 'projects', projectId, 'entities', entityId);
    await updateDoc(entityRef, entityData);
};

export const deleteEntity = async (projectId: string, entityId: string) => {
    const entityRef = doc(db, 'projects', projectId, 'entities', entityId);
    await deleteDoc(entityRef);
};

export const createRelationship = async (projectId: string, relData: Pick<Relationship, 'sourceEntityId' | 'targetEntityId' | 'type' | 'description'>) => {
    await addDoc(collection(db, 'projects', projectId, 'relationships'), {
        ...relData,
        projectId,
        createdAt: serverTimestamp()
    });
};

export const deleteRelationship = async (projectId: string, relationshipId: string) => {
    const relRef = doc(db, 'projects', projectId, 'relationships', relationshipId);
    await deleteDoc(relRef);
};


// --- Credentials Vault Functions ---
export const setProjectCredentialsSalt = async (projectId: string, salt: string) => {
    const projectRef = doc(db, 'projects', projectId);
    await updateDoc(projectRef, { credentialsSalt: salt });
};

export const createCredential = async (projectId: string, credData: Pick<Credential, 'name' | 'description' | 'value' | 'iv'>) => {
    const user = auth.currentUser;
    if (!user) throw new Error("Usuário não autenticado");
    
    await addDoc(collection(db, 'projects', projectId, 'credentials'), {
        ...credData,
        projectId,
        createdBy: user.uid,
        createdAt: serverTimestamp(),
    });
};

export const updateCredential = async (projectId: string, credId: string, credData: Partial<Credential>) => {
    const credRef = doc(db, 'projects', projectId, 'credentials', credId);
    await updateDoc(credRef, credData);
};

export const deleteCredential = async (projectId: string, credId: string) => {
    const credRef = doc(db, 'projects', projectId, 'credentials', credId);
    await deleteDoc(credRef);
};

// --- Database Seeding ---
export const seedDatabase = async (currentUser: User) => {
    if (!currentUser.email) throw new Error("Current user has no email for seeding.");

    const { 
        projectData, 
        modulesData, 
        entitiesData, 
        relationshipsData, 
        tasksData, 
        mockUsers,
        commentsData
    } = getSeedData(currentUser);
    
    const batch = writeBatch(db);

    // 1. Create Project
    const projectRef = doc(collection(db, 'projects'));
    batch.set(projectRef, { ...projectData, createdAt: serverTimestamp() });
    const projectId = projectRef.id;

    // 2. Add mock users (if they don't exist)
    for (const user of mockUsers) {
        const userRef = doc(db, 'users', user.uid);
        batch.set(userRef, { ...user, createdAt: serverTimestamp(), activeTimer: null }, { merge: true });
    }

    // 3. Create Modules & Docs, storing their IDs
    const moduleNameToIdMap = new Map<string, string>();
    for (const module of modulesData) {
        const moduleRef = doc(collection(db, 'projects', projectId, 'modules'));
        batch.set(moduleRef, {
            projectId,
            name: module.name,
            description: module.description,
            icon: module.icon,
            color: module.color,
            createdAt: serverTimestamp(),
            relatedEntityIds: [],
        });
        moduleNameToIdMap.set(module.name, moduleRef.id);
        
        const docRef = doc(collection(db, 'projects', projectId, 'modules', moduleRef.id, 'documentation'));
        batch.set(docRef, { content: module.documentation, updatedAt: serverTimestamp() });
    }

    // 4. Create Entities, storing their IDs
    const entityNameToIdMap = new Map<string, string>();
    for (const entity of entitiesData) {
        const entityRef = doc(collection(db, 'projects', projectId, 'entities'));
        batch.set(entityRef, {
            ...entity,
            projectId,
            createdAt: serverTimestamp(),
            relatedModuleIds: [],
            relatedTaskIds: [],
        });
        entityNameToIdMap.set(entity.name, entityRef.id);
    }
    
    // 5. Create Relationships using stored IDs
    for (const rel of relationshipsData) {
        const sourceEntityId = entityNameToIdMap.get(rel.sourceEntityName);
        const targetEntityId = entityNameToIdMap.get(rel.targetEntityName);
        if (sourceEntityId && targetEntityId) {
            const relRef = doc(collection(db, 'projects', projectId, 'relationships'));
            batch.set(relRef, {
                projectId,
                sourceEntityId,
                targetEntityId,
                type: rel.type,
                description: rel.description,
                createdAt: serverTimestamp(),
            });
        }
    }
    
    // 6. Create Tasks, linking to modules using stored IDs
    const taskIndexToIdMap = new Map<number, string>();
    for (let i = 0; i < tasksData.length; i++) {
        const task = tasksData[i];
        const taskRef = doc(collection(db, 'projects', projectId, 'tasks'));
        taskIndexToIdMap.set(i, taskRef.id);
        const taskPayload: Omit<Task, 'id' | 'createdAt' | 'updatedAt'> = {
            projectId,
            title: task.title,
            description: task.description,
            status: task.status,
            assignee: task.assignee,
            commentsCount: task.commentsCount,
            dueDate: task.dueDate || null,
            dependsOn: [],
            links: [],
            timeLogs: [],
            moduleId: moduleNameToIdMap.get(task.moduleName) || undefined,
        };
        batch.set(taskRef, {
            ...taskPayload,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
        });
    }

    // 7. Create Comments, linking to tasks using stored IDs
    for (const commentGroup of commentsData) {
        const taskId = taskIndexToIdMap.get(commentGroup.taskId);
        if (taskId) {
            for (const comment of commentGroup.comments) {
                const commentRef = doc(collection(db, 'projects', projectId, 'tasks', taskId, 'comments'));
                batch.set(commentRef, {
                    ...comment,
                    createdAt: serverTimestamp(),
                });
            }
        }
    }

    await batch.commit();
};