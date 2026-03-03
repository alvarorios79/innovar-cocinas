const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'client/src/pages/Quotations.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// Reemplazar conversiones en tvCenterConfig
content = content.replace(
  /width: item\.tvCenterConfig\.width \?\? 1\.60,/,
  `width: typeof item.tvCenterConfig.width === 'string' ? parseFloat(item.tvCenterConfig.width) : (item.tvCenterConfig.width ?? 1.60),`
);

content = content.replace(
  /basePrice: item\.tvCenterConfig\.basePrice \?\? 2800000,/,
  `basePrice: typeof item.tvCenterConfig.basePrice === 'string' ? parseFloat(item.tvCenterConfig.basePrice) : (item.tvCenterConfig.basePrice ?? 2800000),`
);

content = content.replace(
  /highGlossPrice: item\.tvCenterConfig\.highGlossPrice \?\? 0,/,
  `highGlossPrice: typeof item.tvCenterConfig.highGlossPrice === 'string' ? parseFloat(item.tvCenterConfig.highGlossPrice) : (item.tvCenterConfig.highGlossPrice ?? 0),`
);

content = content.replace(
  /ledLightsPrice: item\.tvCenterConfig\.ledLightsPrice \?\? 0,/,
  `ledLightsPrice: typeof item.tvCenterConfig.ledLightsPrice === 'string' ? parseFloat(item.tvCenterConfig.ledLightsPrice) : (item.tvCenterConfig.ledLightsPrice ?? 0),`
);

content = content.replace(
  /floatingShelves: item\.tvCenterConfig\.floatingShelves \?\? 2,/,
  `floatingShelves: typeof item.tvCenterConfig.floatingShelves === 'string' ? parseInt(item.tvCenterConfig.floatingShelves) : (item.tvCenterConfig.floatingShelves ?? 2),`
);

content = content.replace(
  /extraShelvesPrice: item\.tvCenterConfig\.extraShelvesPrice \?\? 0,/,
  `extraShelvesPrice: typeof item.tvCenterConfig.extraShelvesPrice === 'string' ? parseFloat(item.tvCenterConfig.extraShelvesPrice) : (item.tvCenterConfig.extraShelvesPrice ?? 0),`
);

content = content.replace(
  /equipmentSpaces: item\.tvCenterConfig\.equipmentSpaces \?\? 0,/,
  `equipmentSpaces: typeof item.tvCenterConfig.equipmentSpaces === 'string' ? parseInt(item.tvCenterConfig.equipmentSpaces) : (item.tvCenterConfig.equipmentSpaces ?? 0),`
);

content = content.replace(
  /equipmentSpacesPrice: item\.tvCenterConfig\.equipmentSpacesPrice \?\? 0,/,
  `equipmentSpacesPrice: typeof item.tvCenterConfig.equipmentSpacesPrice === 'string' ? parseFloat(item.tvCenterConfig.equipmentSpacesPrice) : (item.tvCenterConfig.equipmentSpacesPrice ?? 0),`
);

content = content.replace(
  /transportCost: item\.tvCenterConfig\.transportCost \?\? 150000,/,
  `transportCost: typeof item.tvCenterConfig.transportCost === 'string' ? parseFloat(item.tvCenterConfig.transportCost) : (item.tvCenterConfig.transportCost ?? 150000),`
);

content = content.replace(
  /subtotal: item\.tvCenterConfig\.subtotal \?\? 2800000,/,
  `subtotal: typeof item.tvCenterConfig.subtotal === 'string' ? parseFloat(item.tvCenterConfig.subtotal) : (item.tvCenterConfig.subtotal ?? 2800000),`
);

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Fixed tvCenterConfig conversions');
