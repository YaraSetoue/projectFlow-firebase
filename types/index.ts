import { Timestamp } from '@firebase/firestore';

// A central place for shared TypeScript types and interfaces.

export interface TaskCategory {
  id: string;
  projectId: string;
  name: string;
  color: string;
  icon: string;
  requiresTesting: boolean;
}

export interface TimeLog {
  userId: string;
  durationInSeconds: number;
  loggedAt: Timestamp;
}

export interface ActiveTimer {
  projectId: string;
  taskId: string;
  startTime: Timestamp;
}

export interface User {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  activeTimer?: ActiveTimer | null;
  createdAt?: Timestamp;
}

export type NotificationType = 'task_assigned' | 'comment_mention';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  related: {
    projectId: string;
    projectName: string;
    taskId?: string;
  };
  isRead: boolean;
  createdAt: Timestamp;
  // For invites, we'll store sender info
  sender?: {
    name: string;
    photoURL?: string | null;
  };
}

export type MemberRole = 'owner' | 'editor' | 'viewer';
export const MEMBER_ROLES: MemberRole[] = ['editor', 'viewer'];

export interface Member extends User {
    role: MemberRole;
}

export interface Invitation {
    id: string;
    projectId: string;
    projectName: string;
    recipientEmail: string;
    role: MemberRole;
    status: 'pending' | 'accepted' | 'declined';
    inviter: { // Simplified from UserSummary to just what's needed
        uid: string;
        name: string | null;
    };
    createdAt: Timestamp;
}


export interface Project {
  id: string;
  name: string;
  description: string;
  ownerId: string;
  members: { [key: string]: MemberRole };
  memberUids: string[];
  createdAt: Timestamp;
  credentialsSalt?: string;
}

export type LoginData = {
    email: string;
    password: string;
}

export type RegisterData = LoginData & {
    displayName:string;
}

export type TaskStatus = 'todo' | 'inprogress' | 'done';
export type SubStatus = 'executing' | 'testing' | 'approved';

export interface UserSummary {
  uid: string;
  displayName: string | null;
  photoURL: string | null;
}

export interface Module {
    id: string;
    projectId: string;
    name: string;
    description: string;
    createdAt: Timestamp;
    icon?: string;
    color?: string;
}

export interface ModuleDocumentation {
    id: string;
    content: string;
    updatedAt: Timestamp;
}

export interface TaskLink {
  id: string; // A unique ID for the key in React, generated on the client
  url: string;
  title: string; // A descriptive title for the link
}

export interface TaskDependency {
  taskId: string;
  type: 'blocking' | 'blocked_by';
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  status: TaskStatus;
  subStatus?: SubStatus | null;
  assignee: UserSummary | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  dueDate?: Timestamp | null;
  commentsCount?: number;
  dependencies?: TaskDependency[]; // Array of task dependency objects
  featureId?: string;
  moduleId?: string;
  categoryId: string;
  timeLogs?: TimeLog[];
  links?: TaskLink[];
}

export interface Comment {
    id: string;
    author: UserSummary;
    content: string;
    createdAt: Timestamp;
}

// --- Data Model Types ---

export type DataType = 'String' | 'Number' | 'Boolean' | 'Date' | 'ID' | 'Array' | 'Object';
export const DATA_TYPES: DataType[] = ['String', 'Number', 'Boolean', 'Date', 'ID', 'Array', 'Object'];

export interface Attribute {
  id: string; // client-side generated unique id
  name: string;
  dataType: DataType;
  isRequired: boolean;
  description: string;
}

export interface Entity {
  id: string;
  projectId: string;
  name: string;
  description: string;
  attributes: Attribute[];
  createdAt: Timestamp;
  relatedModuleIds?: string[];
  relatedTaskIds?: string[];
}

export type RelationshipType = 'One to One' | 'One to Many' | 'Many to Many';
export const RELATIONSHIP_TYPES: RelationshipType[] = ['One to One', 'One to Many', 'Many to Many'];

export interface Relationship {
  id: string;
  projectId: string;
  sourceEntityId: string;
  targetEntityId: string;
  type: RelationshipType;
  description: string;
  createdAt: Timestamp;
}

export type AccountProfileData = {
    displayName: string;
}

// --- Credentials Vault Types ---

export interface Credential {
  id: string;
  projectId: string;
  name: string;
  description: string;
  value: string; // Encrypted value
  iv: string; // Initialization Vector
  createdAt: Timestamp;
  createdBy: string; // UID
}

// --- Feature Types ---

export interface UserFlow {
  id: string;
  step: number;
  description: string;
  relatedEntityIds?: string[];
}

export interface TestCase {
  id: string;
  description: string;
  expectedResult: string;
  status: 'pending' | 'passed' | 'failed';
}

export interface Feature {
  id: string;
  projectId: string;
  name: string;
  moduleId: string;
  description: string;
  userFlows: UserFlow[];
  testCases: TestCase[];
  createdAt: Timestamp;
}

// --- Activity Feed Types ---
export type ActivityType = 'task_created' | 'task_status_changed' | 'comment_added' | 'member_added' | 'module_created';

export interface Activity {
    id: string;
    type: ActivityType;
    projectId: string;
    message: string;
    user: UserSummary;
    createdAt: Timestamp;
    taskId?: string; // Optional: to link activity to a specific task
}