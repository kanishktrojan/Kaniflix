import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils';

interface ChartCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export const ChartCard: React.FC<ChartCardProps> = ({
  title,
  children,
  className,
  action,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'bg-surface-dark rounded-xl border border-white/5 overflow-hidden',
        className
      )}
    >
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        {action}
      </div>
      <div className="p-6">{children}</div>
    </motion.div>
  );
};

// Simple Bar Chart Component
interface BarChartProps {
  data: Array<{ label: string; value: number }>;
  maxValue?: number;
  barColor?: string;
  showValues?: boolean;
}

export const SimpleBarChart: React.FC<BarChartProps> = ({
  data,
  maxValue,
  barColor = 'bg-primary',
  showValues = true,
}) => {
  const max = maxValue || Math.max(...data.map((d) => d.value), 1);

  return (
    <div className="space-y-3">
      {data.map((item, index) => (
        <div key={index} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-secondary">{item.label}</span>
            {showValues && (
              <span className="text-white font-medium">{item.value.toLocaleString()}</span>
            )}
          </div>
          <div className="h-2 bg-background rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${(item.value / max) * 100}%` }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className={cn('h-full rounded-full', barColor)}
            />
          </div>
        </div>
      ))}
    </div>
  );
};

// Simple Line/Area visualization
interface LineDataPoint {
  label: string;
  value: number;
}

interface SimpleLineChartProps {
  data: LineDataPoint[];
  height?: number;
  lineColor?: string;
  showArea?: boolean;
}

export const SimpleLineChart: React.FC<SimpleLineChartProps> = ({
  data,
  height = 200,
  lineColor = '#e50914',
  showArea = true,
}) => {
  if (data.length === 0) return null;

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const minValue = Math.min(...data.map((d) => d.value), 0);
  const range = maxValue - minValue || 1;

  const points = data.map((d, i) => ({
    x: (i / (data.length - 1)) * 100,
    y: 100 - ((d.value - minValue) / range) * 100,
  }));

  const pathD = points.reduce((path, point, i) => {
    return path + (i === 0 ? `M ${point.x} ${point.y}` : ` L ${point.x} ${point.y}`);
  }, '');

  const areaD = pathD + ` L 100 100 L 0 100 Z`;

  return (
    <div style={{ height }} className="relative">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="w-full h-full"
      >
        {showArea && (
          <motion.path
            d={areaD}
            fill={`${lineColor}20`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          />
        )}
        <motion.path
          d={pathD}
          fill="none"
          stroke={lineColor}
          strokeWidth="0.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1 }}
        />
        {points.map((point, i) => (
          <motion.circle
            key={i}
            cx={point.x}
            cy={point.y}
            r="1"
            fill={lineColor}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.5 + i * 0.05 }}
          />
        ))}
      </svg>
      {/* X-axis labels */}
      <div className="flex justify-between mt-2">
        {data.filter((_, i) => i % Math.ceil(data.length / 6) === 0).map((d, i) => (
          <span key={i} className="text-xs text-text-secondary">
            {d.label}
          </span>
        ))}
      </div>
    </div>
  );
};

// Donut Chart
interface DonutChartProps {
  data: Array<{ label: string; value: number; color: string }>;
  size?: number;
}

export const DonutChart: React.FC<DonutChartProps> = ({ data, size = 160 }) => {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  if (total === 0) return null;

  let currentAngle = -90;
  const radius = 45;
  const strokeWidth = 12;

  const arcs = data.map((item) => {
    const angle = (item.value / total) * 360;
    const startAngle = currentAngle;
    currentAngle += angle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = ((startAngle + angle) * Math.PI) / 180;

    const x1 = 50 + radius * Math.cos(startRad);
    const y1 = 50 + radius * Math.sin(startRad);
    const x2 = 50 + radius * Math.cos(endRad);
    const y2 = 50 + radius * Math.sin(endRad);

    const largeArc = angle > 180 ? 1 : 0;

    return {
      ...item,
      d: `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      percentage: ((item.value / total) * 100).toFixed(1),
    };
  });

  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} viewBox="0 0 100 100" className="transform -rotate-90">
        {arcs.map((arc, i) => (
          <motion.path
            key={i}
            d={arc.d}
            fill="none"
            stroke={arc.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.5, delay: i * 0.1 }}
          />
        ))}
        <circle cx="50" cy="50" r="33" className="fill-surface-dark" />
      </svg>
      <div className="space-y-2">
        {arcs.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-sm text-text-secondary">{item.label}</span>
            <span className="text-sm text-white font-medium">{item.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChartCard;
