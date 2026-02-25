import { DataTypes } from "sequelize";
import { sequelize } from "../database/connection.js";

/**
 * Canciones para el módulo Piano.
 * notes: array de { note, time, duration, hand } en formato MBT (ej. "0:4:2") y duración ("4n", "8n", etc.)
 */
export const PianoSong = sequelize.define(
  "piano_songs",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    title: {
      type: DataTypes.STRING(200),
      allowNull: false,
    },
    bpm: {
      type: DataTypes.INTEGER,
      defaultValue: 120,
    },
    notes: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
      comment: "Array de { note, time, duration, hand }",
    },
    chords: {
      type: DataTypes.JSON,
      allowNull: true,
      defaultValue: [],
      comment: "Acordes por compás (array de ids de acorde, ej. ['C', 'G', 'Am'])",
    },
    keySignature: {
      type: DataTypes.STRING(20),
      allowNull: true,
      defaultValue: "C",
      comment: "Tonalidad principal de la canción (ej. C, G, Am, etc.)",
    },
  },
  {
    timestamps: true,
    createdAt: "createdAt",
    updatedAt: "updatedAt",
  }
);
