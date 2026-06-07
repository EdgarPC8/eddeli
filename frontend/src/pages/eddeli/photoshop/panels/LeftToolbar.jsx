// import React from "react";
// import { Box, Typography } from "@mui/material";

// export default function LeftToolbar() {
//   return (
//     <Box
//       sx={{
//         height: "100%",
//         borderRight: "1px solid rgba(255,255,255,0.08)",
//         background: "rgba(255,255,255,0.03)",
//         p: 1,
//         display: "flex",
//         flexDirection: "column",
//         gap: 1,
//       }}
//     >
//       <Box
//         sx={{
//           borderRadius: 2,
//           border: "1px dashed rgba(255,255,255,0.25)",
//           p: 1,
//           textAlign: "center",
//         }}
//       >
//         <Typography sx={{ fontSize: 12, fontWeight: 700 }}>
//           TOOLBAR
//         </Typography>
//         <Typography sx={{ fontSize: 11, opacity: 0.75 }}>
//           (Select, Text, Shape…)
//         </Typography>
//       </Box>

//       {/* botones falsos solo para ver */}
//       {["Select", "Text", "Shape", "Image"].map((t) => (
//         <Box
//           key={t}
//           sx={{
//             borderRadius: 2,
//             border: "1px solid rgba(255,255,255,0.10)",
//             background: "rgba(0,0,0,0.25)",
//             py: 1,
//             textAlign: "center",
//             fontSize: 12,
//             opacity: 0.9,
//           }}
//         >
//           {t}
//         </Box>
//       ))}
//     </Box>
//   );
// }
