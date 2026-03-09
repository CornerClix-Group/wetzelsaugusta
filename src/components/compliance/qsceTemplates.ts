export interface QSCEItem {
  id: string;
  points: number;
  label: string;
  isCompliance: boolean;
  description?: string;
}

export interface QSCESection {
  id: string;
  title: string;
  totalPoints: number;
  items: QSCEItem[];
}

export interface QSCECategory {
  name: string;
  totalPoints: number;
  sections: QSCESection[];
}

export const qsceCategories: QSCECategory[] = [
  {
    name: "Cleanliness",
    totalPoints: 71,
    sections: [
      {
        id: "1", title: "Customer Facing Approach", totalPoints: 11,
        items: [
          { id: "1a", points: 2, label: "Sneezeguard clean, free of fingerprints, cracks and dust", isCompliance: false },
          { id: "1b", points: 3, label: "Hours of operation posted in approved format, in good condition and approved hours; Independent Franchisee sign posted. Does the bakery close 10 minutes after close compared to mall hours", isCompliance: false },
          { id: "1c", points: 2, label: "Front facia/façade is clean and in good repair, store is free of clutter", isCompliance: false },
          { id: "1d", points: 2, label: "Ceiling vents and lighting clean, well maintained, free of dust and no burnt-out bulbs", isCompliance: false },
          { id: "1e", points: 2, label: "Rolling station visible to customer; area is clean, sanitary and free of clutter", isCompliance: false },
        ],
      },
      {
        id: "2", title: "Service Area/Presentation", totalPoints: 12,
        items: [
          { id: "2a", points: 3, label: "Counter area, walls and wall tiles clean & maintained, free of cracks and food debris", isCompliance: false },
          { id: "2b", points: 3, label: "Warming unit has all lights functioning, no broken parts", isCompliance: false },
          { id: "2c", points: 3, label: "Warming unit trays and glass are clean and the unit is set to 150°F", isCompliance: false },
          { id: "2d", points: 3, label: "Warming unit has adequate product, all pretzels, dogs and dips are offered; layout is per the current guidelines", isCompliance: false },
        ],
      },
      {
        id: "3", title: "Restroom(s)", totalPoints: 6,
        items: [
          { id: "3a", points: 2, label: "Sinks, mirror & toilets clean and well-maintained; restroom smells clean", isCompliance: false },
          { id: "3b", points: 2, label: "Door, handles, floor and vents clean and well-maintained", isCompliance: false },
          { id: "3c", points: 2, label: "All dispensers (soap, paper towel, toilet paper) stocked; all in good condition", isCompliance: false },
        ],
      },
      {
        id: "4", title: "Trash Area", totalPoints: 4,
        items: [
          { id: "4a", points: 2, label: "Trash cans in lobby and restrooms clean (cover on restroom trash can is highly recommended)", isCompliance: false },
          { id: "4b", points: 2, label: "Trash cans in the back room clean inside and out including handles", isCompliance: false },
        ],
      },
      {
        id: "5", title: "Cabinets, Counters, Shelves, Register Area", totalPoints: 6,
        items: [
          { id: "5a", points: 3, label: "Approved mini counter trash can or a trash can is available nearby; a napkin dispenser and counter straw holder are available on the front counter or nearby", isCompliance: false },
          { id: "5b", points: 3, label: "Cash register area clean, orderly, and attractive; no signs taped to the register or receipt printer", isCompliance: false },
        ],
      },
      {
        id: "6", title: "Front of House Equipment", totalPoints: 19,
        items: [
          { id: "6a", points: 3, label: "Lemonade dispenser free of residue, cracks, and mold; all parts and components clean and in working condition; dispensers are 2/3 full or better", isCompliance: true },
          { id: "6b", points: 3, label: "Granita machine is free of residue, cracks, and mold; all parts and components clean and in working condition; dispensers are 2/3 full or better", isCompliance: true },
          { id: "6c", points: 2, label: "Under counter refrigerator in working condition, clean inside and out including gaskets", isCompliance: false },
          { id: "6d", points: 2, label: "Under counter freezer in working condition, clean inside and out including gaskets", isCompliance: false },
          { id: "6e", points: 3, label: "Soda and ice machine and station in working condition, clean inside and out and free of mold", isCompliance: true },
          { id: "6f", points: 2, label: "Rolling counter clean and sanitary; not lifting, cracked, or split", isCompliance: false },
          { id: "6g", points: 2, label: "Front counter and cabinets free of clutter, nicely organized and clean", isCompliance: false },
          { id: "6h", points: 1, label: "Blue Mesh for granita and lemonade in use as necessary", isCompliance: false },
          { id: "6i", points: 1, label: "All brushes, as defined by brush program, are in bakery and being used", isCompliance: false },
        ],
      },
      {
        id: "7", title: "Back Room", totalPoints: 13,
        items: [
          { id: "7a", points: 2, label: "Back room/storage room clean and organized; chemicals stored away from food", isCompliance: false },
          { id: "7b", points: 2, label: "All equipment and containers are NSF approved", isCompliance: false },
          { id: "7c", points: 2, label: "Mop bucket, cleaning supplies and tools organized and in good condition", isCompliance: false },
          { id: "7d", points: 2, label: "Floors and areas behind/underneath equipment is clean and free from debris", isCompliance: false },
          { id: "7e", points: 1, label: "All shelving is at least 6\" off the floor", isCompliance: false },
          { id: "7f", points: 1, label: "Floor drains clean, mop sink accessible, clean, and free of clutter", isCompliance: false },
          { id: "7g", points: 1, label: "Pest protection program in place, no signs of insects or rodents; pest devices are working, properly installed away from food contact surfaces, changed regularly", isCompliance: true },
          { id: "7h", points: 1, label: "Charged fire extinguisher with current inspection tag is present", isCompliance: false },
          { id: "7i", points: 1, label: "Backroom swinging door closed", isCompliance: false },
        ],
      },
    ],
  },
  {
    name: "Operations",
    totalPoints: 109,
    sections: [
      {
        id: "8", title: "Back Room Equipment", totalPoints: 10,
        items: [
          { id: "8a", points: 2, label: "Upright cooler in working condition, clean inside and out including gaskets", isCompliance: false },
          { id: "8b", points: 2, label: "Upright freezer in working condition, clean inside and out including gaskets", isCompliance: false },
          { id: "8c", points: 2, label: "Oven is clean and set to 600°F; pan liners, sheets and baking trays are in good condition and well organized within the oven unit", isCompliance: false },
          { id: "8d", points: 2, label: "Mixer, bowls and mixing arm clean, in working condition and in good repair", isCompliance: false },
          { id: "8e", points: 2, label: "Ice machine is clean inside and out and is free of mold", isCompliance: true },
        ],
      },
      {
        id: "9", title: "Hand Washing", totalPoints: 6,
        items: [
          { id: "9a", points: 2, label: "Hands washed when appropriate; back line hand sink used before serving customers; gloves used when preparing food and changed as necessary", isCompliance: false },
          { id: "9b", points: 2, label: "Hand washing procedure card posted by hand washing sink", isCompliance: false },
          { id: "9c", points: 2, label: "Hand sink is cleaned out on a daily basis; no visible stains; paper towels and soap dispenser stocked; non-latex gloves available", isCompliance: false },
        ],
      },
      {
        id: "10", title: "Sanitation", totalPoints: 13,
        items: [
          { id: "10a", points: 2, label: "Surfaces clean and sanitary; no mold present", isCompliance: true },
          { id: "10b", points: 2, label: "Proper dishwashing procedures followed; 3-compartment sink set up; sanitizer in use", isCompliance: false },
          { id: "10c", points: 2, label: "Towels in sanitizer bucket available", isCompliance: true },
          { id: "10d", points: 2, label: "Sanitizer test strips available and not expired", isCompliance: false },
          { id: "10e", points: 2, label: "Utensils properly stored (e.g. handles up for proper drainage)", isCompliance: false },
          { id: "10f", points: 1, label: "Water filter has been changed within the past 6 months", isCompliance: false },
          { id: "10g", points: 1, label: "Hot water heater and pump is in working order *RMU locations only*", isCompliance: true },
          { id: "10h", points: 1, label: "Bakery has passed local health inspection and the report is available for review", isCompliance: false },
        ],
      },
      {
        id: "11", title: "Approved Products", totalPoints: 6,
        items: [
          { id: "11a", points: 2, label: "All products purchased from approved vendors (e.g. logo cups, dough mix, lemonade, granita, hot dogs)", isCompliance: true },
          { id: "11b", points: 2, label: "All required menu items available for sale, including promotional items", isCompliance: true },
          { id: "11c", points: 2, label: "No unapproved menu items available for sale", isCompliance: true },
        ],
      },
      {
        id: "12", title: "Product Dating & Rotation", totalPoints: 6,
        items: [
          { id: "12a", points: 2, label: "All products properly dated with expiration date and date product was received", isCompliance: true },
          { id: "12b", points: 2, label: "Products rotated using the FIFO (First in First Out) method", isCompliance: true },
          { id: "12c", points: 2, label: "Check 3 items for expiration dates; no expired products for sale and all expired products discarded immediately", isCompliance: true },
        ],
      },
      {
        id: "13", title: "Product Quality & Freshness", totalPoints: 28,
        items: [
          { id: "13a", points: 4, label: "All baked products fresh and less than 30 minutes old", isCompliance: false },
          { id: "13b", points: 4, label: "All baked products are golden brown in color; Wetzel's Dogs are round, not square", isCompliance: false },
          { id: "13c", points: 4, label: "All pretzels weigh 6 ounces and are 6¾\" x 7\" in shape", isCompliance: false },
          { id: "13d", points: 4, label: "All Bitz are prepared per recipe and bags look full", isCompliance: false },
          { id: "13e", points: 4, label: "Dog Bites, Cheesy Dog Bites and Pizza Bitz are prepared per recipe; 9 each per cup. Mozzarella Stickz are prepared per recipe; 5 each per cup", isCompliance: false },
          { id: "13f", points: 2, label: "Granita tastes fresh and prepared according to recipe", isCompliance: false },
          { id: "13g", points: 2, label: "Lemonade tastes fresh and prepared according to recipe", isCompliance: false },
          { id: "13h", points: 2, label: "Browning solution is fresh and prepared according to recipe", isCompliance: false },
          { id: "13i", points: 2, label: "Cinnamon sugar is fresh and prepared according to recipe", isCompliance: false },
        ],
      },
      {
        id: "14", title: "Temperatures", totalPoints: 16,
        items: [
          { id: "14a", points: 4, label: "Temperature logs are complete, hot food is 140°F or above and cold food is 40°F or below", isCompliance: true },
          { id: "14b", points: 4, label: "Lemonade and Granita held at proper temperatures", isCompliance: false },
          { id: "14c", points: 4, label: "Dipz held at proper temperature", isCompliance: false },
          { id: "14e", points: 4, label: "Probe thermometers available; sanitized and calibrated. All refrigerators and freezers must have working thermometers inside", isCompliance: false },
        ],
      },
      {
        id: "15", title: "Uniforms", totalPoints: 6,
        items: [
          { id: "15a", points: 3, label: "Crew members wearing approved, clean, presentable, uniform, including shirt, apron, and hat or visor", isCompliance: false },
          { id: "15b", points: 3, label: "Crew members groomed appropriately (no nail polish, no visible piercings except ears, long hair must be restrained)", isCompliance: false },
        ],
      },
      {
        id: "16", title: "Gift Cards, Credit Cards, Toast POS, ProfitKeeper & Online Ordering", totalPoints: 7,
        items: [
          { id: "16a", points: 2, label: "Approved gift cards displayed and accepted at register; no unapproved cards or certificates; credit cards accepted (including Visa, MasterCard, Discover and American Express); credit card number not printed on receipts", isCompliance: true },
          { id: "16b", points: 2, label: "Toast POS system installed and fully functional", isCompliance: true },
          { id: "16c", points: 2, label: "Store has completed all ProfitKeeper submissions with full and correct information", isCompliance: true },
          { id: "16d", points: 1, label: "Store is participating in Online Ordering program, all online sales, including third-party delivery sales, are rung in correctly", isCompliance: true },
        ],
      },
      {
        id: "17", title: "Menu Boards & Marketing Materials / Store Appearance", totalPoints: 15,
        items: [
          { id: "17a", points: 3, label: "Digital menu boards current and properly working; POP current and displayed in proper holders", isCompliance: true },
          { id: "17b", points: 3, label: "No handwritten signs; all marketing tools and signs must be approved; no severely faded signs", isCompliance: false },
          { id: "17c", points: 3, label: "Nutritional reference charts available for guests upon request", isCompliance: false },
          { id: "17d", points: 3, label: "Tip jar present and in good condition, not cracked or broken", isCompliance: false },
          { id: "17e", points: 3, label: "Toast shroud installed with current menu displayed", isCompliance: false },
        ],
      },
      {
        id: "18", title: "Building and Equipment Safety", totalPoints: 4,
        items: [
          { id: "18a", points: 4, label: "Building and equipment properly maintained (no broken tiles, broken handles, missing ceiling tiles, plumbing issues, fire exits not blocked, back door locked, wet floor sign available); no hazardous chemicals in store", isCompliance: false },
        ],
      },
      {
        id: "19", title: "Crew Training", totalPoints: 4,
        items: [
          { id: "19a", points: 2, label: "Crew training materials in place; crew has health cards (where applicable), certified food handler on staff with certificate posted", isCompliance: false },
          { id: "19b", points: 2, label: "Training program / 1Huddle app in place with all employees signed up; minimum 3 master cashiers signed up", isCompliance: true },
        ],
      },
      {
        id: "20", title: "Crew Information", totalPoints: 8,
        items: [
          { id: "20a", points: 2, label: "Daily, weekly and/or monthly goals are current and in use; daily sales paperwork is available", isCompliance: false },
          { id: "20b", points: 2, label: "Federal and State labor laws posted (may include OSHA, Minimum Wage, Family & Medical Leave Act Laws, No Smoking), where employees can clearly see them", isCompliance: false },
          { id: "20c", points: 2, label: "Daily/weekly cleaning checklists and job aids are posted and maintained. Blue Book in place, filled out properly and updated by management team", isCompliance: false },
          { id: "20d", points: 1, label: "Sampling checklist posted and evidence sampling is performed daily, especially during peak hours", isCompliance: true },
          { id: "20e", points: 1, label: "Certified Manager on staff 40 hours per week, and adequate team members", isCompliance: true },
        ],
      },
    ],
  },
  {
    name: "Service",
    totalPoints: 70,
    sections: [
      {
        id: "21", title: "Acknowledge", totalPoints: 10,
        items: [
          { id: "21a", points: 5, label: "Crew member greeted guest in a timely and friendly manner; smiled warmly and made eye contact throughout interaction", isCompliance: false },
          { id: "21b", points: 5, label: "POS Operator requests customers phone number for loyalty program on every transaction", isCompliance: false },
        ],
      },
      {
        id: "22", title: "Connect", totalPoints: 20,
        items: [
          { id: "22a", points: 4, label: "Crew member initiated the service interaction and led guest through the ordering process", isCompliance: false },
          { id: "22b", points: 4, label: "Crew member educated guest, raised awareness of new products and/or promotions", isCompliance: false },
          { id: "22c", points: 4, label: "Crew member is upselling products; offered sample of fresh product", isCompliance: false },
          { id: "22d", points: 4, label: "Order completed accurately as customer ordered", isCompliance: false },
          { id: "22e", points: 4, label: "Store is staffed according to customer traffic", isCompliance: false },
        ],
      },
      {
        id: "23", title: "Serve the Customer", totalPoints: 11,
        items: [
          { id: "23a", points: 4, label: "Crew member presented order in the correct packaging as ordered by guest", isCompliance: false },
          { id: "23b", points: 4, label: "Crew member was pleasant and polite during the visit", isCompliance: false },
          { id: "23c", points: 3, label: "Crew member thanked the customer", isCompliance: false },
        ],
      },
      {
        id: "24", title: "Sense of Urgency", totalPoints: 9,
        items: [
          { id: "24a", points: 4, label: "Crew member provided quick and efficient service; made serving the guest a priority", isCompliance: false },
          { id: "24b", points: 1, label: "Service times: Crew should be efficiently moving customers through the line", isCompliance: false },
          { id: "24c", points: 4, label: "Store is signed up for, live, staffed, prepared for, and properly executing third-party delivery orders", isCompliance: true },
        ],
      },
    ],
  },
];

export const complianceIssuesList = [
  "Failing QSCE score (74% or below)",
  "Mold growth",
  "Product rotation & dating (undated items)",
  "Quality product (expired items)",
  "Required / unapproved items for sale",
  "Infestation",
  "Not accepting credit cards",
  "Health, safety and sanitation issues",
  "Not participating in national marketing promotions / décor / other brand issues",
];

export function getStatusFromPercentage(percentage: number): {
  label: string;
  color: string;
  bgColor: string;
} {
  if (percentage >= 95) return { label: "Exceeds Expectations", color: "text-green-700", bgColor: "bg-green-100" };
  if (percentage >= 85) return { label: "Meets Expectations", color: "text-blue-700", bgColor: "bg-blue-100" };
  if (percentage >= 75) return { label: "Below Expectations", color: "text-yellow-700", bgColor: "bg-yellow-100" };
  return { label: "Out of Compliance", color: "text-red-700", bgColor: "bg-red-100" };
}

export function getAllItems(): QSCEItem[] {
  return qsceCategories.flatMap(c => c.sections.flatMap(s => s.items));
}
