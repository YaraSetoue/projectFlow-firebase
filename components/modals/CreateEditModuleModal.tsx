import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactQuill from 'react-quill';
import { createModule, updateModule, getModuleDocumentation } from '../../services/firestoreService';
import { Module } from '../../types';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Textarea from '../ui/Textarea';
import Popover from '../ui/Popover';
import IconRenderer from '../ui/IconRenderer';
import { Loader2 } from 'lucide-react';
import { MODULE_ICON_OPTIONS, MODULE_COLOR_OPTIONS, MODULE_COLOR_MAP } from '../../utils/styleUtils';


interface CreateEditModuleModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  module: Module | null;
  onSuccess: () => void;
}

const QuillEditor = React.memo(ReactQuill);

const CreateEditModuleModal: React.FC<CreateEditModuleModalProps> = ({ isOpen, onClose, projectId, module, onSuccess }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('module');
  const [color, setColor] = useState('gray');
  const [documentation, setDocumentation] = useState('');
  const [activeTab, setActiveTab] = useState<'general' | 'documentation'>('general');
  
  const [isLoading, setIsLoading] = useState(false);
  const [isDocLoading, setIsDocLoading] = useState(false);
  const [error, setError] = useState('');
  const [isIconPopoverOpen, setIsIconPopoverOpen] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);

  const isEditing = module !== null;

  useEffect(() => {
    if (isOpen) {
        if (isEditing) {
            setName(module.name);
            setDescription(module.description);
            setIcon(module.icon || 'module');
            setColor(module.color || 'gray');
            setIsDocLoading(true);
            getModuleDocumentation(projectId, module.id)
                .then(setDocumentation)
                .catch(err => {
                    console.error("Failed to load documentation", err);
                    setError("Não foi possível carregar a documentação do módulo.");
                })
                .finally(() => setIsDocLoading(false));
        } else {
            // Reset form for creation
            setName('');
            setDescription('');
            setDocumentation('');
            setIcon('module');
            setColor('gray');
        }
        setActiveTab('general'); // Reset to general tab whenever modal opens/module changes
    }
  }, [module, isEditing, projectId, isOpen]);

  useEffect(() => {
    if (isOpen && activeTab === 'general' && !isLoading && !isEditing) {
      setTimeout(() => nameInputRef.current?.focus(), 150); // Timeout for modal animation
    }
  }, [isOpen, activeTab, isLoading, isEditing]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
        setError('O nome do módulo é obrigatório.');
        setActiveTab('general');
        return;
    }
    if (!projectId) {
        setError("ID do projeto está faltando. Não é possível criar o módulo.");
        return;
    }
    setError('');
    setIsLoading(true);

    try {
        const moduleData = { name, description, icon, color };
        if (isEditing) {
            await updateModule(projectId, module.id, moduleData, documentation);
        } else {
            await createModule(projectId, moduleData, documentation);
        }
        onSuccess(); // Notify parent of success
    } catch (err: any) {
      console.error("Failed to save module:", err);
      setError(err.message || 'Falha ao salvar o módulo. Por favor, tente novamente.');
    } finally {
        setIsLoading(false);
    }
  };

  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike', 'blockquote', 'code-block'],
      [{'list': 'ordered'}, {'list': 'bullet'}, {'indent': '-1'}, {'indent': '+1'}],
      ['link'],
      ['clean']
    ],
  };

  const modalTitle = isEditing ? `Editar Módulo: ${module.name}` : 'Criar Novo Módulo';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={modalTitle}>
      <form onSubmit={handleSubmit} className="flex flex-col" style={{ minHeight: '500px' }}>
          {/* Tab Navigation */}
          <div className="flex border-b border-slate-200 dark:border-slate-700 -mx-6 px-4" role="tablist">
              <button
                  type="button"
                  onClick={() => setActiveTab('general')}
                  className={`px-4 py-3 text-sm font-semibold transition-colors focus:outline-none ${
                      activeTab === 'general'
                          ? 'border-b-2 border-brand-500 text-brand-600 dark:text-brand-400'
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border-b-2 border-transparent'
                  }`}
                  aria-selected={activeTab === 'general'}
                  role="tab"
              >
                  Geral
              </button>
              <button
                  type="button"
                  onClick={() => setActiveTab('documentation')}
                  className={`px-4 py-3 text-sm font-semibold transition-colors focus:outline-none ${
                      activeTab === 'documentation'
                          ? 'border-b-2 border-brand-500 text-brand-600 dark:text-brand-400'
                          : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border-b-2 border-transparent'
                  }`}
                  aria-selected={activeTab === 'documentation'}
                  role="tab"
              >
                  Documentação
              </button>
          </div>

          {/* Tab Content */}
          <div className="flex-grow py-6">
              <div role="tabpanel" hidden={activeTab !== 'general'}>
                   <div className="space-y-6">
                      <div className="flex items-end gap-2">
                        <Popover
                            isOpen={isIconPopoverOpen}
                            onClose={() => setIsIconPopoverOpen(false)}
                            trigger={
                                <Button type="button" variant="outline" size="icon" onClick={() => setIsIconPopoverOpen(true)} className="flex-shrink-0">
                                    <IconRenderer name={icon} />
                                </Button>
                            }
                            className="w-72"
                        >
                             <div className="w-full bg-white dark:bg-slate-800 border dark:border-slate-700 rounded-md shadow-lg p-2 grid grid-cols-6 gap-1">
                                {MODULE_ICON_OPTIONS.map(iconName => (
                                    <button 
                                        key={iconName}
                                        type="button"
                                        onClick={() => { setIcon(iconName); setIsIconPopoverOpen(false); }}
                                        className={`flex items-center justify-center p-2 rounded-md hover:bg-slate-100 dark:hover:bg-slate-700 ${icon === iconName ? 'bg-brand-100 dark:bg-brand-500/20' : ''}`}
                                    >
                                        <IconRenderer name={iconName} size={20} />
                                    </button>
                                ))}
                             </div>
                        </Popover>
                        <div className="flex-grow">
                            <label htmlFor="moduleName" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                Nome do Módulo
                            </label>
                            <Input
                                id="moduleName"
                                ref={nameInputRef}
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Ex: Autenticação de Usuário"
                                required
                                disabled={isLoading}
                            />
                        </div>
                      </div>

                      <div>
                          <label htmlFor="moduleDescription" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                              Descrição
                          </label>
                          <Textarea
                              id="moduleDescription"
                              value={description}
                              onChange={(e) => setDescription(e.target.value)}
                              placeholder="Um breve resumo do que este módulo faz."
                              rows={3}
                              disabled={isLoading}
                          />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cor</label>
                        <div className="flex flex-wrap gap-2">
                            {MODULE_COLOR_OPTIONS.map(colorName => (
                                <button
                                    key={colorName}
                                    type="button"
                                    title={colorName}
                                    onClick={() => setColor(colorName)}
                                    className={`h-7 w-7 rounded-full transition-transform duration-150 ${MODULE_COLOR_MAP[colorName]?.bg || 'bg-gray-500'} ${color === colorName ? 'ring-2 ring-offset-2 dark:ring-offset-slate-900 ring-current' : 'hover:scale-110'}`}
                                ></button>
                            ))}
                        </div>
                      </div>
                  </div>
              </div>

              <div role="tabpanel" hidden={activeTab !== 'documentation'}>
                   {isDocLoading ? (
                      <div className="h-[250px] flex items-center justify-center bg-slate-100 dark:bg-slate-800 rounded-md">
                          <Loader2 className="animate-spin" />
                      </div>
                  ) : (
                      <div>
                        <QuillEditor
                            theme="snow"
                            value={documentation}
                            onChange={setDocumentation}
                            modules={quillModules}
                            className="h-[320px]"
                            readOnly={isLoading}
                            placeholder="Comece a escrever a documentação aqui..."
                        />
                      </div>
                  )}
              </div>
          </div>

          {/* Footer */}
          <div className="flex flex-col gap-4 mt-auto pt-4 -mx-6 -mb-6 px-6 pb-6 border-t border-slate-200 dark:border-slate-700">
              {error && <p className="text-sm text-red-500 text-center">{error}</p>}
              <div className="flex justify-end gap-3">
                  <Button type="button" variant="ghost" onClick={onClose} disabled={isLoading}>
                      Cancelar
                  </Button>
                  <Button type="submit" disabled={isLoading || isDocLoading || !name.trim()}>
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isEditing ? 'Salvar Alterações' : 'Criar Módulo'}
                  </Button>
              </div>
            </div>
          </form>
    </Modal>
  );
};

export default CreateEditModuleModal;