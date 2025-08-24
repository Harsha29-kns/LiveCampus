import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CertificateLayout } from '../../types';
import Button from './Button';
import Input from './Input';
import { X, Type, Hash, QrCode } from 'lucide-react';

interface CertificateLayoutEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    templateUrl: string;
    initialLayout: CertificateLayout | null;
    onSave: (layout: CertificateLayout) => void;
}

type DraggableElement = 'name' | 'regNo' | 'qrCode';

const CertificateLayoutEditorModal: React.FC<CertificateLayoutEditorModalProps> = ({
    isOpen,
    onClose,
    templateUrl,
    initialLayout,
    onSave,
}) => {
    const [layout, setLayout] = useState<CertificateLayout>({
        name: { x: 200, y: 200, fontSize: 80, color: '#000000', align: 'center' },
        regNo: { x: 200, y: 300, fontSize: 40, color: '#000000', align: 'center' },
        qrCode: { x: 200, y: 400, size: 150 },
    });

    const [selectedElement, setSelectedElement] = useState<DraggableElement | null>(null);
    const [dragging, setDragging] = useState(false);
    const [offset, setOffset] = useState({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (initialLayout) {
            setLayout(initialLayout);
        }
    }, [initialLayout]);

    const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>, element: DraggableElement) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        setDragging(true);
        setSelectedElement(element);
        setOffset({
            x: e.clientX - rect.left - layout[element].x,
            y: e.clientY - rect.top - layout[element].y,
        });
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (dragging && selectedElement && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setLayout(prev => ({
                ...prev,
                [selectedElement]: {
                    ...prev[selectedElement],
                    x: e.clientX - rect.left - offset.x,
                    y: e.clientY - rect.top - offset.y,
                },
            }));
        }
    }, [dragging, selectedElement, offset]);

    const handleMouseUp = useCallback(() => {
        setDragging(false);
    }, []);

    useEffect(() => {
        if (isOpen) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isOpen, handleMouseMove, handleMouseUp]);

    const handlePropertyChange = (
        element: 'name' | 'regNo',
        property: 'fontSize' | 'color' | 'align',
        value: string | number
    ) => {
        setLayout(prev => ({
            ...prev,
            [element]: { ...prev[element], [property]: value },
        }));
    };
    
    const handleQrCodeSizeChange = (value: string) => {
        const newSize = parseInt(value) || 0; // FIX: Default to 0 if input is empty
        setLayout(prev => ({
            ...prev,
            qrCode: { ...prev.qrCode, size: newSize },
        }));
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
                <div className="flex justify-between items-center p-4 border-b">
                    <h2 className="text-xl font-bold">Certificate Layout Editor</h2>
                    <Button variant="ghost" size="sm" onClick={onClose}><X /></Button>
                </div>

                <div className="flex flex-1 overflow-hidden">
                    {/* Editor Panel */}
                    <div className="w-1/4 p-4 border-r overflow-y-auto">
                        <h3 className="font-semibold mb-4">Properties</h3>
                        
                        <div className="mb-6">
                            <h4 className="font-medium text-sm text-gray-600 mb-2 flex items-center"><Type size={14} className="mr-2"/> Student Name</h4>
                            <Input label="Font Size" type="number" value={layout.name.fontSize} onChange={(e) => handlePropertyChange('name', 'fontSize', parseInt(e.target.value) || 0)} />
                            <Input label="Color" type="color" value={layout.name.color} onChange={(e) => handlePropertyChange('name', 'color', e.target.value)} />
                        </div>

                        <div className="mb-6">
                            <h4 className="font-medium text-sm text-gray-600 mb-2 flex items-center"><Hash size={14} className="mr-2"/> Registration No.</h4>
                            <Input label="Font Size" type="number" value={layout.regNo.fontSize} onChange={(e) => handlePropertyChange('regNo', 'fontSize', parseInt(e.target.value) || 0)} />
                            <Input label="Color" type="color" value={layout.regNo.color} onChange={(e) => handlePropertyChange('regNo', 'color', e.target.value)} />
                        </div>

                         <div className="mb-6">
                            <h4 className="font-medium text-sm text-gray-600 mb-2 flex items-center"><QrCode size={14} className="mr-2"/> QR Code</h4>
                            <Input label="Size (px)" type="number" value={layout.qrCode.size} onChange={(e) => handleQrCodeSizeChange(e.target.value)} />
                        </div>
                    </div>

                    {/* Canvas */}
                    <div className="flex-1 bg-gray-200 p-4 overflow-auto flex items-center justify-center">
                        <div ref={containerRef} className="relative shadow-lg" style={{ width: '1000px', height: '707px' }}>
                            <img src={templateUrl} alt="Certificate Template" className="w-full h-full" />
                            
                            <div
                                onMouseDown={(e) => handleMouseDown(e, 'name')}
                                className="absolute cursor-grab p-2 border border-dashed border-blue-500"
                                style={{
                                    left: `${layout.name.x}px`,
                                    top: `${layout.name.y}px`,
                                    fontSize: `${layout.name.fontSize}px`,
                                    color: layout.name.color,
                                    transform: 'translate(-50%, -50%)'
                                }}
                            >
                                [Student Name]
                            </div>

                            <div
                                onMouseDown={(e) => handleMouseDown(e, 'regNo')}
                                className="absolute cursor-grab p-2 border border-dashed border-green-500"
                                style={{
                                    left: `${layout.regNo.x}px`,
                                    top: `${layout.regNo.y}px`,
                                    fontSize: `${layout.regNo.fontSize}px`,
                                    color: layout.regNo.color,
                                    transform: 'translate(-50%, -50%)'
                                }}
                            >
                                [Registration No]
                            </div>
                            
                            <div
                                onMouseDown={(e) => handleMouseDown(e, 'qrCode')}
                                className="absolute cursor-grab flex items-center justify-center bg-gray-300/50 border border-dashed border-red-500"
                                style={{
                                    left: `${layout.qrCode.x}px`,
                                    top: `${layout.qrCode.y}px`,
                                    width: `${layout.qrCode.size}px`,
                                    height: `${layout.qrCode.size}px`,
                                    transform: 'translate(-50%, -50%)'
                                }}
                            >
                                <QrCode size={layout.qrCode.size > 0 ? layout.qrCode.size * 0.8 : 0} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end p-4 border-t gap-3">
                    <Button variant="outline" onClick={onClose}>Cancel</Button>
                    <Button onClick={() => onSave(layout)}>Save Layout</Button>
                </div>
            </div>
        </div>
    );
};

export default CertificateLayoutEditorModal;