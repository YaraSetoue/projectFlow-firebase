import React from 'react';
import { 
    Boxes, Bug, Zap, Book, FileText, Code, Users, Database, Shield, Settings, MessageSquare, HelpCircle 
} from 'lucide-react';

const iconMap: Record<string, React.ElementType> = {
  module: Boxes,
  bug: Bug,
  zap: Zap,
  book: Book,
  file: FileText,
  code: Code,
  users: Users,
  database: Database,
  shield: Shield,
  settings: Settings,
  'message-square': MessageSquare,
  default: HelpCircle,
};

interface IconRendererProps {
    name?: string;
    [key: string]: any; // To allow passing other props like size, className
}

export const IconRenderer: React.FC<IconRendererProps> = ({ name, ...props }) => {
  const IconComponent = name ? (iconMap[name.toLowerCase()] || iconMap.default) : iconMap.default;
  return <IconComponent {...props} />;
};

export default IconRenderer;
