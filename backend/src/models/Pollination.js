const mongoose = require('mongoose');

const pollinationSchema = new mongoose.Schema(
  {
    // Plant information
    name: {
      type: String,
      required: [true, 'Plant name is required'],
      enum: {
        values: ['ampalaya_bilog', 'upo_smooth', 'patola', 'cucumber', 'kalabasa'],
        message: 'Plant name must be one of: ampalaya_bilog, upo_smooth, patola, cucumber',
      },
    },

    // Display names for localization
    displayName: {
      english: {
        type: String,
        required: false,
      },
      tagalog: {
        type: String,
        required: false,
      },
    },

    // Plant gender
    gender: {
      type: String,
      enum: {
        values: ['male', 'female', 'undetermined'],
        message: 'Gender must be one of: male, female, undetermined',
      },
      default: 'undetermined',
    },

    // Important dates
    datePlanted: {
      type: Date,
      required: [true, 'Date planted is required'],
    },

    datePollinated: {
      type: Date,
      validate: {
        validator: function (date) {
          return !date || (this.datePlanted && date >= this.datePlanted);
        },
        message: 'Pollination date cannot be before planting date',
      },
    },

    // Status tracking
    status: {
      type: String,
      enum: ['planted', 'flowering', 'pollinated', 'fruiting', 'harvested'],
      default: 'planted',
    },

    // Single image for tracking progress
    image: {
      url: String,
      cloudinaryId: String,
      caption: String,
      uploadDate: {
        type: Date,
        default: Date.now,
      },
    },

    // Notes and observations
    notes: [
      {
        content: {
          type: String,
          required: true,
          maxlength: [500, 'Note cannot exceed 500 characters'],
        },
        date: {
          type: Date,
          default: Date.now,
        },
        type: {
          type: String,
          enum: ['observation', 'care', 'problem', 'milestone'],
          default: 'observation',
        },
      },
    ],

    // Notes and observations
    pollinationStatus: [
      {
        statuspollination: {
          type: String,
          enum: ['Successful', 'Failed', 'pending'],
          default: 'pending',
        },
        date: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // Pollination timing info for notifications
    pollinationTiming: {
      startHour: {
        type: Number,
        min: 0,
        max: 23,
        description: 'Hour when pollination window opens (0-23)',
      },
      endHour: {
        type: Number,
        min: 0,
        max: 23,
        description: 'Hour when pollination window closes (0-23)',
      },
      scheduledDate: {
        type: Date,
        description: 'Date of the next pollination window',
      },
      notificationScheduled: {
        oneHourBefore: {
          type: Boolean,
          default: false,
        },
        thirtyMinsBefore: {
          type: Boolean,
          default: false,
        },
      },
    },

    // User who manages this plant
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User is required'],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for better query performance
pollinationSchema.index({ user: 1, createdAt: -1 });
pollinationSchema.index({ name: 1, status: 1 });
pollinationSchema.index({ datePlanted: 1 });

// Virtual for plant age in days
pollinationSchema.virtual('ageInDays').get(function () {
  if (!this.datePlanted) return 0;
  const today = new Date();
  const timeDiff = today.getTime() - this.datePlanted.getTime();
  return Math.floor(timeDiff / (1000 * 3600 * 24));
});

// Virtual for gender detection timeline
pollinationSchema.virtual('genderDetectionInfo').get(function () {
  if (!this.datePlanted) return null;

  const plantData = {
    ampalaya: { male: { min: 30, max: 35 }, female: { min: 38, max: 45 } },
    upo: { male: { min: 40, max: 45 }, female: { min: 45, max: 55 } },
    patola: { male: { min: 35, max: 40 }, female: { min: 40, max: 45 } },
    kundol: { male: { min: 45, max: 55 }, female: { min: 55, max: 65 } },
    kalabasa: { male: { min: 25, max: 30 }, female: { min: 30, max: 35 } },
  };

  const data = plantData[this.name];
  if (!data) return null;

  const ageInDays = this.ageInDays;
  const plantedDate = new Date(this.datePlanted);

  // Calculate male detection dates
  const maleEarliest = new Date(plantedDate);
  maleEarliest.setDate(maleEarliest.getDate() + data.male.min);
  const maleLatest = new Date(plantedDate);
  maleLatest.setDate(maleLatest.getDate() + data.male.max);

  // Calculate female detection dates
  const femaleEarliest = new Date(plantedDate);
  femaleEarliest.setDate(femaleEarliest.getDate() + data.female.min);
  const femaleLatest = new Date(plantedDate);
  femaleLatest.setDate(femaleLatest.getDate() + data.female.max);

  // Format dates as "Nov 15-20"
  const formatDateRange = (earliest, latest) => {
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    const earliestMonth = monthNames[earliest.getMonth()];
    const latestMonth = monthNames[latest.getMonth()];

    if (earliestMonth === latestMonth) {
      return `${earliestMonth} ${earliest.getDate()}-${latest.getDate()}`;
    } else {
      return `${earliestMonth} ${earliest.getDate()} - ${latestMonth} ${latest.getDate()}`;
    }
  };

  return {
    maleDetection: formatDateRange(maleEarliest, maleLatest),
    femaleDetection: formatDateRange(femaleEarliest, femaleLatest),
    canDetectMale: ageInDays >= data.male.min,
    canDetectFemale: ageInDays >= data.female.min,
  };
});

// Virtual for pollination estimation
pollinationSchema.virtual('pollinationEstimate').get(function () {
  if (!this.datePlanted || this.gender === 'undetermined') {
    return 'TBA - Gender not determined yet';
  }

  const plantData = {
    ampalaya: { pollination: { min: 40, max: 50 } },
    upo: { pollination: { min: 50, max: 60 } },
    patola: { pollination: { min: 45, max: 55 } },
    kundol: { pollination: { min: 55, max: 70 } },
    kalabasa: { pollination: { min: 30, max: 40 } },
  };

  const data = plantData[this.name];
  if (!data) return 'Soon';

  const plantedDate = new Date(this.datePlanted);
  const earliestDate = new Date(plantedDate);
  earliestDate.setDate(earliestDate.getDate() + data.pollination.min);

  const latestDate = new Date(plantedDate);
  latestDate.setDate(latestDate.getDate() + data.pollination.max);

  const today = new Date();

  if (today >= earliestDate && today <= latestDate) {
    return 'Ready for pollination now!';
  } else if (today < earliestDate) {
    const daysLeft = Math.ceil((earliestDate - today) / (1000 * 3600 * 24));
    return `Ready in ${daysLeft} days (${earliestDate.toLocaleDateString()})`;
  } else {
    return 'Pollination window passed';
  }
});

// Remove all the complex static methods and replace with simple ones

// Static method to get display names
pollinationSchema.statics.getDisplayNames = function () {
  return {
    ampalaya: {
      english: 'Bitter Gourd',
      tagalog: 'Ampalaya',
    },
    patola: {
      english: 'Sponge Gourd',
      tagalog: 'Patola',
    },
    upo: {
      english: 'Bottle Gourd',
      tagalog: 'Upo',
    },
    kalabasa: {
      english: 'Squash',
      tagalog: 'Kalabasa',
    },
    kundol: {
      english: 'Winter Melon',
      tagalog: 'Kundol',
    },
  };
};

// Instance method to add image (simplified)
pollinationSchema.methods.addImage = function (imageData) {
  this.image = {
    url: imageData.url,
    cloudinaryId: imageData.cloudinaryId,
    caption: imageData.caption,
    uploadDate: new Date(),
  };
  return this.save();
};

// Instance method to add note
pollinationSchema.methods.addNote = function (content, type = 'observation') {
  this.notes.push({
    content,
    type,
    date: new Date(),
  });
  return this.save();
};

// Instance method to mark flowering (simplified)
pollinationSchema.methods.markFlowering = function (gender, _date = new Date()) {
  if (gender === 'male' || gender === 'female') {
    this.gender = gender;
    this.status = 'flowering';
  }
  return this.save();
};

// Instance method to mark pollination
pollinationSchema.methods.markPollinated = function (date) {
  // If no date provided, use current date
  this.datePollinated = date || new Date();
  this.status = 'pollinated';

  // Set up pollination timing for notifications
  this.setPollintionTiming(date || new Date());

  return this.save();
};

// Instance method to set pollination timing based on plant type
pollinationSchema.methods.setPollintionTiming = function (pollinationDate) {
  // Pollination timing by plant type
  const timingMap = {
    ampalaya: { startHour: 6, endHour: 9 }, // 6:00 AM - 9:00 AM
    kalabasa: { startHour: 6, endHour: 9 }, // 6:00 AM - 9:00 AM
    kundol: { startHour: 6, endHour: 8 }, // 6:00 AM - 8:00 AM (very early)
    patola: { startHour: 5, endHour: 20 }, // Morning OR Evening - needs user input, default to evening
    upo: { startHour: 17, endHour: 20 }, // 5:00 PM - 8:00 PM
  };

  const timing = timingMap[this.name];
  if (timing) {
    this.pollinationTiming = {
      startHour: timing.startHour,
      endHour: timing.endHour,
      scheduledDate: pollinationDate,
      notificationScheduled: {
        oneHourBefore: false,
        thirtyMinsBefore: false,
      },
    };
  }
};

// Static method to get plants needing attention (simplified)
pollinationSchema.statics.getPlantsNeedingAttention = function (userId) {
  return this.find({
    user: userId,
    status: { $in: ['planted', 'flowering'] },
    gender: { $ne: 'undetermined' }, // Only show plants with determined gender
  }).sort({ datePlanted: 1 });
};

// Static method to get upcoming pollinations (simplified)
pollinationSchema.statics.getUpcomingPollinations = function (userId, _days = 7) {
  return this.find({
    user: userId,
    status: { $in: ['planted', 'flowering'] },
    gender: { $ne: 'undetermined' },
  }).sort({ datePlanted: 1 });
};

// Pre-save middleware to set display names (simplified)
pollinationSchema.pre('save', function (next) {
  // Set display names if not already set
  if (this.name && (!this.displayName || !this.displayName.english)) {
    const displayNames = this.constructor.getDisplayNames();
    this.displayName = displayNames[this.name];
  }

  next();
});

const Pollination = mongoose.model('Pollination', pollinationSchema);

module.exports = Pollination;
