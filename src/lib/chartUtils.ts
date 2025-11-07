import { ChartData } from './gigachat';

/**
 * Конвертирует график в изображение (base64)
 */
export async function chartToImage(chartData: ChartData): Promise<string> {
  // Для MVP используем Canvas API для создания простых графиков
  // В будущем можно использовать recharts или chart.js для более сложных графиков

  if (!chartData.datasets || chartData.datasets.length === 0) {
    throw new Error('Для построения графика требуется как минимум один набор данных');
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Не удалось создать canvas контекст');
  }

  const width = 800;
  const height = 500;
  canvas.width = width;
  canvas.height = height;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  ctx.fillStyle = '#000000';
  ctx.font = 'bold 20px Arial';
  ctx.textAlign = 'center';
  ctx.fillText(chartData.title, width / 2, 40);

  const padding = { top: 80, bottom: 80, left: 100, right: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const allValues = chartData.datasets.flatMap(dataset => dataset.data);
  const maxValue = Math.max(...allValues, 1);
  const stepX = chartWidth / Math.max(chartData.labels.length - 1, 1);
  const stepY = chartHeight / maxValue;
  const colors = ['#2563eb', '#16a34a', '#dc2626', '#ea580c', '#9333ea', '#0891b2', '#f97316', '#0ea5e9'];

  // Оси
  ctx.strokeStyle = '#cccccc';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding.left, padding.top);
  ctx.lineTo(padding.left, height - padding.bottom);
  ctx.lineTo(width - padding.right, height - padding.bottom);
  ctx.stroke();

  if (chartData.type === 'line') {
    chartData.datasets.forEach((dataset, datasetIndex) => {
      const color = colors[datasetIndex % colors.length];
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.beginPath();
      chartData.labels.forEach((_, index) => {
        const x = padding.left + index * stepX;
        const y = height - padding.bottom - (dataset.data[index] || 0) * stepY;
        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      // Точки
      ctx.fillStyle = color;
      chartData.labels.forEach((_, index) => {
        const x = padding.left + index * stepX;
        const y = height - padding.bottom - (dataset.data[index] || 0) * stepY;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      });
    });
  } else if (chartData.type === 'bar') {
    const groupWidth = chartWidth / chartData.labels.length;
    const datasetCount = Math.max(chartData.datasets.length, 1);
    const barWidth = (groupWidth * 0.8) / datasetCount;
    const offset = (groupWidth - barWidth * datasetCount) / 2;

    chartData.labels.forEach((_, labelIndex) => {
      chartData.datasets.forEach((dataset, datasetIndex) => {
        const color = colors[datasetIndex % colors.length];
        const value = dataset.data[labelIndex] || 0;
        const barHeight = value * stepY;
        const x = padding.left + labelIndex * groupWidth + offset + datasetIndex * barWidth;
        const y = height - padding.bottom - barHeight;

        ctx.fillStyle = color;
        ctx.fillRect(x, y, barWidth, barHeight);
      });
    });
  } else if (chartData.type === 'pie') {
    const dataset = chartData.datasets[0];
    const centerX = padding.left + chartWidth / 2;
    const centerY = padding.top + chartHeight / 2;
    const radius = Math.min(chartWidth, chartHeight) / 2 - 20;

    const total = dataset.data.reduce((sum, val) => sum + val, 0);
    let currentAngle = -Math.PI / 2;

    dataset.data.forEach((value, index) => {
      const sliceAngle = (value / total) * Math.PI * 2;
      const color = colors[index % colors.length];
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
      ctx.closePath();
      ctx.fill();

      const labelAngle = currentAngle + sliceAngle / 2;
      const labelX = centerX + Math.cos(labelAngle) * (radius * 0.7);
      const labelY = centerY + Math.sin(labelAngle) * (radius * 0.7);
      ctx.fillStyle = '#000000';
      ctx.font = '12px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`${chartData.labels[index]}: ${Math.round((value / total) * 100)}%`, labelX, labelY);

      currentAngle += sliceAngle;
    });
  }

  // Подписи осей X
  ctx.fillStyle = '#666666';
  ctx.font = '12px Arial';
  ctx.textAlign = 'center';
  chartData.labels.forEach((label, index) => {
    const x = chartData.type === 'bar'
      ? padding.left + (chartWidth / chartData.labels.length) * index + (chartWidth / chartData.labels.length) / 2
      : padding.left + index * stepX;
    ctx.fillText(label, x, height - padding.bottom + 25);
  });

  // Подписи оси Y для линейных и столбчатых диаграмм
  if (chartData.type !== 'pie') {
    ctx.textAlign = 'right';
    for (let i = 0; i <= 5; i++) {
      const value = Math.round((maxValue / 5) * i);
      const y = height - padding.bottom - (chartHeight / 5) * i;
      ctx.fillText(value.toString(), padding.left - 10, y + 5);
    }
  }

  // Легенда
  ctx.textAlign = 'left';
  ctx.font = '12px Arial';
  chartData.datasets.forEach((dataset, index) => {
    const legendX = padding.left + index * 150;
    const legendY = padding.top - 35;
    ctx.fillStyle = colors[index % colors.length];
    ctx.fillRect(legendX, legendY, 20, 10);
    ctx.fillStyle = '#000000';
    ctx.fillText(dataset.label, legendX + 25, legendY + 10);
  });

  if (chartData.caption) {
    ctx.fillStyle = '#666666';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(chartData.caption, width / 2, height - 20);
  }

  return canvas.toDataURL('image/png');
}

