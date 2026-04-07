import { IconBox, IconNetwork, IconWorldWww, IconFileText, IconGripVertical } from '@tabler/icons-react';

interface PaletteItemProps {
    type: string;
    label: string;
    icon: React.ReactNode;
    color: string;
}

function PaletteItem({ type, label, icon, color }: PaletteItemProps) {
    const onDragStart = (event: React.DragEvent) => {
        event.dataTransfer.setData('application/reactflow-type', type);
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div
            className="palette-item"
            draggable
            onDragStart={onDragStart}
            style={{ '--accent': color } as React.CSSProperties}
        >
            <IconGripVertical size={14} className="palette-grip" />
            <div className="palette-icon" style={{ background: color }}>
                {icon}
            </div>
            <div className="palette-label">
                <span className="palette-title">{label}</span>
                <span className="palette-hint">Drag to canvas</span>
            </div>
        </div>
    );
}

export default function NodePalette() {
    return (
        <div className="node-palette">
            <div className="palette-header">
                <h3>Resources</h3>
                <p>Drag blocks onto the canvas</p>
            </div>
            <div className="palette-items">
                <PaletteItem
                    type="deployment"
                    label="Deployment"
                    icon={<IconBox size={18} color="#fff" />}
                    color="#3b82f6"
                />
                <PaletteItem
                    type="service"
                    label="Service"
                    icon={<IconNetwork size={18} color="#fff" />}
                    color="#10b981"
                />
                <PaletteItem
                    type="ingress"
                    label="Ingress"
                    icon={<IconWorldWww size={18} color="#fff" />}
                    color="#8b5cf6"
                />
                <PaletteItem
                    type="configmap"
                    label="ConfigMap"
                    icon={<IconFileText size={18} color="#fff" />}
                    color="#f59e0b"
                />
            </div>
        </div>
    );
}
