export interface ChecklistItem {
  id: string;
  label: string;
  description?: string;
  photoRequirement?: "optional" | "required" | "minimum";
  minimumPhotos?: number;
  isTemperatureLog?: boolean;
  tempDevice?: string;
  tempMin?: number;
  tempMax?: number;
}

export interface ChecklistTemplate {
  title: string;
  description: string;
  items: ChecklistItem[];
}

export const checklistTemplates: Record<string, ChecklistTemplate> = {
  opening: {
    title: "Opening Checklist",
    description: "Complete all items before opening for business",
    items: [
      { id: "hygiene", label: "All team members have washed hands and are in proper uniform" },
      { id: "equipment", label: "All equipment is clean and functioning properly" },
      { id: "temps", label: "Temperature logs recorded for all refrigeration units" },
      { id: "inventory", label: "Inventory checked and sufficient for day's operations" },
      { id: "pos", label: "POS system tested and operational" },
      { id: "safety", label: "Safety equipment checked (fire extinguisher, first aid)" },
      { id: "cleanliness", label: "All surfaces sanitized and ready for food prep" },
      { id: "signage", label: "Menu boards and signage displayed correctly" },
    ],
  },
  prep: {
    title: "Prep Checklist",
    description: "Daily food preparation standards",
    items: [
      { id: "dough", label: "Pretzel dough prepared per recipe specifications" },
      { id: "toppings", label: "All toppings prepared and portioned correctly" },
      { id: "sauces", label: "Sauces and dips prepared fresh and properly stored" },
      { id: "dating", label: "All prep items properly dated and labeled" },
      { id: "rotation", label: "FIFO rotation verified for all ingredients" },
      { id: "temps_prep", label: "Food temperatures verified during prep", description: "Hot foods above 135°F, cold foods below 41°F" },
      { id: "waste", label: "Waste tracking completed for prep discards" },
    ],
  },
  quality: {
    title: "Quality Inspection",
    description: "Product quality control standards - Pass/Needs Improvement/Fail scoring required",
    items: [
      { id: "appearance", label: "Pretzels meet visual appearance standards", photoRequirement: "required", minimumPhotos: 2 },
      { id: "texture", label: "Texture and consistency verified" },
      { id: "temperature", label: "Holding temperatures maintained properly" },
      { id: "portion", label: "Portion sizes meet specifications", photoRequirement: "required", minimumPhotos: 1 },
      { id: "freshness", label: "Freshness standards maintained" },
      { id: "packaging", label: "Packaging and presentation meets brand standards", photoRequirement: "required", minimumPhotos: 1 },
    ],
  },
  food_safety: {
    title: "Food Safety Checklist",
    description: "Critical food safety compliance",
    items: [
      { id: "handwashing", label: "Handwashing stations stocked and functional" },
      { id: "gloves", label: "Proper glove usage verified" },
      { id: "cross_contamination", label: "Cross-contamination prevention protocols followed" },
      { id: "allergens", label: "Allergen protocols followed and documented" },
      { id: "sanitizer", label: "Sanitizer concentration tested and within range", description: "200-400 ppm for quaternary ammonium" },
      { id: "trash", label: "Trash properly contained and removed regularly" },
      { id: "pests", label: "No evidence of pest activity" },
    ],
  },
  temperature: {
    title: "Temperature Logs",
    description: "Required temperature monitoring with automatic validation",
    items: [
      { 
        id: "fridge_1", 
        label: "Refrigerator #1 temperature", 
        isTemperatureLog: true,
        tempDevice: "Refrigerator #1",
        tempMin: 33,
        tempMax: 41,
        photoRequirement: "optional"
      },
      { 
        id: "fridge_2", 
        label: "Refrigerator #2 temperature", 
        isTemperatureLog: true,
        tempDevice: "Refrigerator #2",
        tempMin: 33,
        tempMax: 41,
        photoRequirement: "optional"
      },
      { 
        id: "freezer", 
        label: "Freezer temperature", 
        isTemperatureLog: true,
        tempDevice: "Freezer",
        tempMin: -10,
        tempMax: 0,
        photoRequirement: "optional"
      },
      { 
        id: "hot_hold", 
        label: "Hot holding temperature", 
        isTemperatureLog: true,
        tempDevice: "Hot Holding Unit",
        tempMin: 135,
        tempMax: 200,
        photoRequirement: "optional"
      },
      { 
        id: "oven", 
        label: "Oven temperature", 
        isTemperatureLog: true,
        tempDevice: "Oven",
        tempMin: 350,
        tempMax: 450,
        photoRequirement: "optional"
      },
      { 
        id: "pretzels", 
        label: "Finished pretzel internal temperature", 
        isTemperatureLog: true,
        tempDevice: "Finished Pretzels",
        tempMin: 190,
        tempMax: 210,
        photoRequirement: "required",
        minimumPhotos: 1
      },
    ],
  },
  closing: {
    title: "Closing Checklist",
    description: "End of day closing procedures",
    items: [
      { id: "deep_clean", label: "All equipment cleaned and sanitized" },
      { id: "storage", label: "All food properly stored and dated" },
      { id: "waste_log", label: "Waste log completed for end of day" },
      { id: "cash", label: "Cash drawer reconciled and secured" },
      { id: "security", label: "All doors and windows secured" },
      { id: "lights", label: "Unnecessary lights and equipment turned off" },
      { id: "tomorrow", label: "Prep list created for next day" },
      { id: "issues", label: "Any maintenance or supply issues documented" },
    ],
  },
};

export function getChecklistTemplate(type: string): ChecklistTemplate {
  return (
    checklistTemplates[type] || {
      title: "Unknown Checklist",
      description: "",
      items: [],
    }
  );
}
