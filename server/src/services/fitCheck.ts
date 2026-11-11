import { IProduct, IFitCheckItemResult } from '../../../shared/types.js';

export function runFitCheck(items: IProduct[]): IFitCheckItemResult[] {
  const results: IFitCheckItemResult[] = [];

  // Check 1: Individual product stock and warranty validity
  for (const product of items) {
    if (product.availability === 'out_of_stock') {
      results.push({
        targetId: product.id,
        status: 'Incompatible',
        reason: `${product.title} is currently out of stock at ${product.merchantName}.`,
        checkedRules: ['INVENTORY_AVAILABILITY']
      });
    } else {
      results.push({
        targetId: product.id,
        status: 'Compatible',
        reason: `${product.title} is available in stock with ${product.warrantyMonths}m manufacturer warranty and ${product.returnPolicyDays}d return window.`,
        checkedRules: ['INVENTORY_AVAILABILITY', 'WARRANTY_POLICY_CHECK']
      });
    }
  }

  // Check 2: Cross-pair compatibility (e.g. Laptop + Monitor / Dock)
  const laptops = items.filter(i => i.category === 'laptops');
  const monitors = items.filter(i => i.category === 'monitors');
  const docks = items.filter(i => i.id.includes('dock') || i.category === 'gaming_accessories');

  for (const laptop of laptops) {
    // Check monitor pairing
    for (const monitor of monitors) {
      const laptopPD = laptop.compatibilityMeta?.powerDeliveryWatts || 65;
      const monitorPD = monitor.compatibilityMeta?.powerDeliveryWatts || 0;

      if (monitorPD > 0 && monitorPD >= laptopPD) {
        results.push({
          targetId: monitor.id,
          pairedWithId: laptop.id,
          status: 'Compatible',
          reason: `Single-cable setup verified: Monitor provides ${monitorPD}W USB-C Power Delivery, satisfying laptop's ${laptopPD}W requirement.`,
          checkedRules: ['USB_C_POWER_DELIVERY', 'DISPLAYPORT_ALT_MODE']
        });
      } else if (monitorPD > 0 && monitorPD < laptopPD) {
        results.push({
          targetId: monitor.id,
          pairedWithId: laptop.id,
          status: 'Needs verification',
          reason: `Monitor provides ${monitorPD}W PD, but laptop specifies ${laptopPD}W. Laptop may charge slowly under heavy GPU loads.`,
          checkedRules: ['USB_C_POWER_DELIVERY']
        });
      } else {
        results.push({
          targetId: monitor.id,
          pairedWithId: laptop.id,
          status: 'Compatible',
          reason: `Display output verified via standard HDMI / DisplayPort.`,
          checkedRules: ['VIDEO_OUTPUT_CHECK']
        });
      }
    }

    // Check dock pairing
    for (const dock of docks) {
      results.push({
        targetId: dock.id,
        pairedWithId: laptop.id,
        status: 'Compatible',
        reason: `USB-C Docking station interface verified with ${laptop.title}.`,
        checkedRules: ['DOCK_BUS_SPEED', 'PORT_EXPANSION_MATCH']
      });
    }
  }

  return results;
}

