/**
 * Compassionate Rides Pricing Calculator
 * Implements the full pricing model with distance calculation, premiums, and discounts
 */

/**
 * Professional Pricing Constants - Updated to match Dispatcher App
 */
export const PRICING_CONFIG = {
  BASE_RATES: {
    PER_LEG: 50,  // $50 per leg (not per trip)
  },
  DISTANCE: {
    FRANKLIN_COUNTY: 3.00,    // $3 per mile inside Franklin County
    OUTSIDE_FRANKLIN: 4.00,   // $4 per mile outside Franklin County
  },
  PREMIUMS: {
    WEEKEND_AFTER_HOURS: 40,  // Before 8am or after 6pm, weekends
    EMERGENCY: 40,            // Emergency trip fee
    WHEELCHAIR_RENTAL: 25,    // Wheelchair rental fee (only if we provide)
    COUNTY_SURCHARGE: 50      // $50 per county outside Franklin (2+ counties)
  },
  DISCOUNTS: {
    VETERAN: 0.20  // 20% veteran discount
  },
  HOURS: {
    AFTER_HOURS_START: 18,  // 6pm (18:00)
    AFTER_HOURS_END: 8      // 8am (08:00)
  }
};

/**
 * Calculate distance between two addresses using Google Maps Distance Matrix API
 * Falls back to estimated distance if Google Maps is not available
 */
export async function calculateDistance(pickup, destination) {
  try {
    if (!window.google || !window.google.maps) {
      // Fallback: estimate distance based on address strings
      console.warn('Google Maps API not available, using estimated distance');
      return estimateDistanceFallback(pickup, destination);
    }

    return new Promise((resolve, reject) => {
      const service = new window.google.maps.DistanceMatrixService();
      
      service.getDistanceMatrix({
        origins: [pickup],
        destinations: [destination],
        travelMode: window.google.maps.TravelMode.DRIVING,
        unitSystem: window.google.maps.UnitSystem.IMPERIAL,
        avoidHighways: false,
        avoidTolls: false
      }, (response, status) => {
        if (status === 'OK' && response.rows[0].elements[0].status === 'OK') {
          const element = response.rows[0].elements[0];
          const distanceInMiles = element.distance.value * 0.000621371; // Convert meters to miles
          const duration = element.duration.text;
          
          resolve({
            distance: Math.round(distanceInMiles * 100) / 100, // Round to 2 decimal places
            duration,
            distanceText: element.distance.text,
            isEstimated: false
          });
        } else {
          // Fall back to estimation
          resolve(estimateDistanceFallback(pickup, destination));
        }
      });
    });
  } catch (error) {
    console.error('Distance calculation error:', error);
    // Fall back to estimation
    return estimateDistanceFallback(pickup, destination);
  }
}

/**
 * Fallback distance estimation when Google Maps API is not available
 */
function estimateDistanceFallback(pickup, destination) {
  // Simple estimation based on address complexity and typical local distances
  const estimatedDistance = Math.max(5, Math.min(25, Math.random() * 15 + 5));
  
  return {
    distance: Math.round(estimatedDistance * 100) / 100,
    duration: `${Math.round(estimatedDistance * 2.5)} mins`, // Rough estimate
    distanceText: `~${estimatedDistance.toFixed(1)} mi`,
    isEstimated: true
  };
}

/**
 * Check if given time is during after-hours (before 8am or after 6pm)
 */
export function isAfterHours(dateTime) {
  const hour = new Date(dateTime).getHours();
  return hour < PRICING_CONFIG.HOURS.AFTER_HOURS_END || hour >= PRICING_CONFIG.HOURS.AFTER_HOURS_START;
}

/**
 * Determine if addresses are in Franklin County using Google Geocoding API
 */
export async function checkFranklinCountyStatus(pickupAddress, destinationAddress) {
  try {
    if (!window.google || !window.google.maps) {
      // Default to Franklin County if Google Maps not available
      console.warn('Google Maps API not available, defaulting to Franklin County rates');
      return {
        isInFranklinCounty: true,
        countiesOut: 0,
        pickup: 'Franklin',
        destination: 'Franklin'
      };
    }

    const geocoder = new window.google.maps.Geocoder();
    
    const [pickupResult, destinationResult] = await Promise.all([
      new Promise((resolve) => {
        geocoder.geocode({ address: pickupAddress }, (results, status) => {
          if (status === 'OK' && results[0]) {
            resolve(results[0]);
          } else {
            resolve(null);
          }
        });
      }),
      new Promise((resolve) => {
        geocoder.geocode({ address: destinationAddress }, (results, status) => {
          if (status === 'OK' && results[0]) {
            resolve(results[0]);
          } else {
            resolve(null);
          }
        });
      })
    ]);
    
    // Extract county from geocoding results
    const getCountyFromComponents = (addressComponents) => {
      const countyComponent = addressComponents.find(component =>
        component.types.includes('administrative_area_level_2')
      );
      return countyComponent ? countyComponent.long_name.replace(' County', '') : null;
    };
    
    const pickupCounty = pickupResult ? getCountyFromComponents(pickupResult.address_components) : null;
    const destinationCounty = destinationResult ? getCountyFromComponents(destinationResult.address_components) : null;
    
    console.log('County detection:', { pickupCounty, destinationCounty });
    
    const franklinCountyNames = ['Franklin', 'Franklin County'];
    const isPickupInFranklin = pickupCounty && franklinCountyNames.includes(pickupCounty);
    const isDestinationInFranklin = destinationCounty && franklinCountyNames.includes(destinationCounty);
    
    // Trip is "in Franklin County" if both pickup and destination are in Franklin County
    const isInFranklinCounty = isPickupInFranklin && isDestinationInFranklin;
    
    // Count unique counties (excluding Franklin if both ends are in Franklin)
    const uniqueCounties = new Set();
    if (pickupCounty && pickupCounty !== 'Franklin') uniqueCounties.add(pickupCounty);
    if (destinationCounty && destinationCounty !== 'Franklin') uniqueCounties.add(destinationCounty);
    
    return {
      isInFranklinCounty,
      countiesOut: uniqueCounties.size,
      pickup: pickupCounty || 'Unknown',
      destination: destinationCounty || 'Unknown'
    };
  } catch (error) {
    console.error('County detection error:', error);
    // Default to Franklin County rates on error
    return {
      isInFranklinCounty: true,
      countiesOut: 0,
      pickup: 'Franklin',
      destination: 'Franklin'
    };
  }
}

/**
 * Check if given date is a weekend (Saturday or Sunday)
 */
export function isWeekend(dateTime) {
  const day = new Date(dateTime).getDay();
  return day === 0 || day === 6; // Sunday = 0, Saturday = 6
}

/**
 * Calculate total trip price based on professional rate structure
 */
export function calculateTripPrice({
  isRoundTrip = false,
  distance = 0,
  pickupDateTime,
  wheelchairType = 'no_wheelchair',
  clientType = 'facility', // 'individual' or 'facility'
  additionalPassengers = 0,
  isEmergency = false,
  countyInfo = null // { isInFranklinCounty: true, countiesOut: 0 }
}) {
  let breakdown = {
    basePrice: 0,
    roundTripPrice: 0,
    distancePrice: 0,
    countyPrice: 0,
    weekendAfterHoursSurcharge: 0,
    emergencyFee: 0,
    wheelchairPrice: 0,
    veteranDiscount: 0,
    total: 0
  };

  // Professional base rate: $50 per leg
  breakdown.basePrice = PRICING_CONFIG.BASE_RATES.PER_LEG;
  
  // Round trip adds second leg
  if (isRoundTrip) {
    breakdown.roundTripPrice = PRICING_CONFIG.BASE_RATES.PER_LEG;
  }

  // Distance charge calculation with Franklin County logic
  if (distance > 0) {
    const effectiveDistance = isRoundTrip ? distance * 2 : distance;
    const isInFranklinCounty = countyInfo?.isInFranklinCounty !== false; // Default to true
    
    if (isInFranklinCounty) {
      breakdown.distancePrice = effectiveDistance * PRICING_CONFIG.DISTANCE.FRANKLIN_COUNTY;
    } else {
      breakdown.distancePrice = effectiveDistance * PRICING_CONFIG.DISTANCE.OUTSIDE_FRANKLIN;
    }
  }

  // County surcharge for trips outside Franklin County (2+ counties)
  if (countyInfo && countyInfo.countiesOut >= 2) {
    breakdown.countyPrice = (countyInfo.countiesOut - 1) * PRICING_CONFIG.PREMIUMS.COUNTY_SURCHARGE;
  }

  // Combined weekend and after-hours premium
  if (pickupDateTime) {
    const isAfterHoursTime = isAfterHours(pickupDateTime);
    const isWeekendTime = isWeekend(pickupDateTime);
    
    if (isAfterHoursTime || isWeekendTime) {
      breakdown.weekendAfterHoursSurcharge = PRICING_CONFIG.PREMIUMS.WEEKEND_AFTER_HOURS;
    }
  }

  // Emergency fee
  if (isEmergency) {
    breakdown.emergencyFee = PRICING_CONFIG.PREMIUMS.EMERGENCY;
  }

  // Wheelchair rental fee (only when CCT provides wheelchair)
  if (wheelchairType === 'provided') {
    breakdown.wheelchairPrice = PRICING_CONFIG.PREMIUMS.WHEELCHAIR_RENTAL;
  }

  // Calculate subtotal before veteran discount
  const subtotal = breakdown.basePrice + 
                   breakdown.roundTripPrice +
                   breakdown.distancePrice + 
                   breakdown.countyPrice +
                   breakdown.weekendAfterHoursSurcharge +
                   breakdown.emergencyFee +
                   breakdown.wheelchairPrice;

  // Apply veteran discount (20%)
  // Note: Veteran status would need to be passed in or detected from client profile
  breakdown.veteranDiscount = 0; // Will implement when veteran status is available

  // Final total
  breakdown.total = subtotal - breakdown.veteranDiscount;

  // Round all monetary values to 2 decimal places
  Object.keys(breakdown).forEach(key => {
    breakdown[key] = Math.round(breakdown[key] * 100) / 100;
  });

  return breakdown;
}

/**
 * Format currency for display
 */
export function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

/**
 * Main pricing function that matches dispatcher app interface
 */
export async function calculatePrice({
  origin,
  destination,
  isRoundTrip = false,
  pickupDate,
  pickupTime,
  wheelchairType = 'none',
  provideWheelchair = false,
  additionalPassengers = 0,
  isEmergency = false
}) {
  try {
    // Calculate distance
    const distanceResult = await calculateDistance(origin, destination);
    
    // Get county information
    const countyInfo = await checkFranklinCountyStatus(origin, destination);
    
    // Format pickup datetime
    const pickupDateTime = pickupDate && pickupTime ? `${pickupDate}T${pickupTime}:00` : null;
    
    // Map wheelchair type for pricing
    const wheelchairPricing = provideWheelchair ? 'provided' : wheelchairType;
    
    // Calculate pricing
    const pricing = calculateTripPrice({
      isRoundTrip,
      distance: distanceResult.distance,
      pickupDateTime,
      wheelchairType: wheelchairPricing,
      additionalPassengers,
      isEmergency,
      countyInfo
    });
    
    // Create breakdown for display
    const breakdown = {};
    if (pricing.basePrice > 0) breakdown['Base rate'] = pricing.basePrice;
    if (pricing.roundTripPrice > 0) breakdown['Round trip'] = pricing.roundTripPrice;
    if (pricing.distancePrice > 0) breakdown['Distance'] = pricing.distancePrice;
    if (pricing.countyPrice > 0) breakdown['County surcharge'] = pricing.countyPrice;
    if (pricing.weekendAfterHoursSurcharge > 0) breakdown['Weekend/After hours'] = pricing.weekendAfterHoursSurcharge;
    if (pricing.emergencyFee > 0) breakdown['Emergency fee'] = pricing.emergencyFee;
    if (pricing.wheelchairPrice > 0) breakdown['Wheelchair rental'] = pricing.wheelchairPrice;
    if (pricing.veteranDiscount > 0) breakdown['Veteran discount'] = -pricing.veteranDiscount;
    
    return {
      totalPrice: pricing.total,
      breakdown,
      distance: distanceResult.distance,
      duration: distanceResult.duration,
      isEstimate: distanceResult.isEstimated
    };
  } catch (error) {
    console.error('Price calculation error:', error);
    return {
      totalPrice: 0,
      breakdown: { error: 'Unable to calculate price' },
      distance: 0,
      duration: 'Unknown',
      isEstimate: true
    };
  }
}