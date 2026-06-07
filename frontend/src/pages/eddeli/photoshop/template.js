export const template = {
  "canvas": {
    "width": 1920,
    "height": 1080
  },
  "groups": [
    {
      "id": "group_product",
      "x": 0,
      "y": 0
    },
    {
      "id": "group_price",
      "x": 250,
      "y": 1360
    },
    {
      "id": "group_title",
      "x": 80,
      "y": 70
    },
    {
      "id": "group_badge",
      "x": 1450,
      "y": 80
    }
  ],
  "layers": [
    {
      "id": "product_image",
      "groupId": "group_product",
      "type": "image",
      "x": 882,
      "y": 65,
      "w": 1000,
      "h": 958,
      "zIndex": 10,
      "props": {
        "src": "EdDeli/conos-frgou.jpg",
        "fit": "cover",
        "borderRadius": 30
      },
      "bind": {
        "srcFrom": "imageUrl",
        "srcPrefix": "",
        "fallbackSrc": "EdDeli/conos-frgou.jpg"
      },
      "name": "product_image",
      "visible": true,
      "locked": false
    },
    {
      "id": "price_text",
      "groupId": "group_price",
      "type": "text",
      "x": 24,
      "y": 12,
      "w": 372,
      "h": 116,
      "zIndex": 30,
      "props": {
        "text": "$0.50",
        "fontFamily": "Inter, system-ui, Arial",
        "fontSize": 96,
        "fontWeight": 900,
        "color": "#FFD54F",
        "align": "center"
      },
      "bind": {
        "textFrom": "data.computed.priceText"
      },
      "name": "price_text",
      "visible": true,
      "locked": false
    },
    {
      "id": "title_bg",
      "groupId": "group_title",
      "type": "shape",
      "x": -48,
      "y": -45,
      "w": 821,
      "h": 297,
      "zIndex": 40,
      "props": {
        "fill": "rgba(0,0,0,0.25)",
        "borderRadius": 22
      },
      "name": "title_bg",
      "visible": true,
      "locked": false
    },
    {
      "id": "title_text",
      "groupId": "group_title",
      "type": "text",
      "x": 19,
      "y": -14,
      "w": 698,
      "h": 244,
      "zIndex": 50,
      "props": {
        "text": "NOMBRE DEL PRODUCTO",
        "fontFamily": "Poppins, Inter, system-ui, Arial",
        "fontSize": 54,
        "fontWeight": 800,
        "color": "#FFFFFF",
        "align": "left"
      },
      "bind": {
        "textFrom": "displayName",
        "maxLen": 32
      },
      "name": "title_text",
      "visible": true,
      "locked": false
    },
    {
      "id": "weight_text",
      "groupId": "group_title",
      "type": "text",
      "x": -20,
      "y": 550,
      "w": 398,
      "h": 76,
      "zIndex": 55,
      "props": {
        "text": "Esta es la descripción del producto",
        "fontFamily": "Inter, system-ui, Arial",
        "fontSize": 28,
        "fontWeight": 600,
        "color": "rgba(255,255,255,0.85)",
        "align": "left"
      },
      "bind": {
        "textFrom": "product.desc"
      },
      "name": "weight_text",
      "visible": true,
      "locked": false
    },
    {
      "id": "badge_text",
      "groupId": "group_badge",
      "type": "text",
      "x": -1313,
      "y": 337,
      "w": 328,
      "h": 70,
      "zIndex": 73,
      "props": {
        "text": "OFERTA",
        "fontFamily": "Inter, system-ui, Arial",
        "fontSize": 48,
        "fontWeight": 900,
        "color": "#FFFFFF",
        "align": "center"
      },
      "bind": {
        "textFrom": "badge"
      },
      "name": "badge_text",
      "visible": true,
      "locked": false
    },
    {
      "id": "title_bg_copy",
      "groupId": "group_title",
      "type": "shape",
      "x": -71,
      "y": 487,
      "w": 479,
      "h": 177,
      "zIndex": 41,
      "props": {
        "fill": "rgba(0,0,0,0.25)",
        "borderRadius": 22
      },
      "name": "title_bg_copy",
      "visible": true,
      "locked": false
    },
    {
      "id": "text_mkj9kd64_l6nbl",
      "groupId": "group_title",
      "type": "text",
      "x": 1402,
      "y": 397,
      "w": 177,
      "h": 152,
      "zIndex": 71,
      "props": {
        "text": "$10",
        "fontFamily": "Inter, system-ui, Arial",
        "fontSize": 70,
        "fontWeight": 800,
        "color": "#FFFFFF",
        "align": "left"
      },
      "bind": {
        "textFrom": "priceOverride"
      },
      "name": "text_precio",
      "visible": true,
      "locked": false
    },
    {
      "id": "image_mkja16xk_026gu",
      "groupId": "group_product",
      "type": "image",
      "x": 1365,
      "y": 354,
      "w": 377,
      "h": 308,
      "zIndex": 69,
      "props": {
        "src": "EdDeli/ads/badges/estrella_badge_dorada.png",
        "fit": "cover",
        "borderRadius": 20
      },
      "bind": null,
      "name": "image_mkja16xk_026gu",
      "visible": true,
      "locked": false
    },
    {
      "id": "image_mkjama5t_hi6wg",
      "groupId": "group_product",
      "type": "image",
      "x": 60,
      "y": 237,
      "w": 500,
      "h": 431,
      "zIndex": 72,
      "props": {
        "src": "EdDeli/ads/badges/etiqueta_dorada.png",
        "fit": "cover",
        "borderRadius": 20
      },
      "bind": null,
      "name": "image_mkjama5t_hi6wg",
      "visible": true,
      "locked": false
    }
  ],
  "data": {
    "product": {
      "id": 65,
      "name": "Yoyos",
      "primaryImageUrl": "EdDeli/yoyos-jnw46.png",
      "unitAbbr": "un",
      "desc": null,
      "standardWeightGrams": 0,
      "categorySlug": "panaderia",
      "type": "final",
      "price": 0.5,
      "status": "Listo ahora",
      "tags": [],
      "wholesaleRules": [],
      "isUniqueToday": false
    },
    "data": {
      "id": 40,
      "section": "home",
      "badge": "Bajo Pedido",
      "imageUrl": "EdDeli/yoyos-jnw46.png",
      "position": 0,
      "isActive": true,
      "title": "Yoyos",
      "subtitle": null,
      "priceOverride": 0.5,
      "displayName": "Yoyos",
      "displayPrice": 0.5,
      "minOrderQty": null,
      "product": {
        "id": 65,
        "name": "Yoyos",
        "primaryImageUrl": "EdDeli/yoyos-jnw46.png",
        "unitAbbr": "un",
        "desc": null,
        "standardWeightGrams": 0,
        "categorySlug": "panaderia",
        "type": "final",
        "price": 0.5,
        "status": "Listo ahora",
        "tags": [],
        "wholesaleRules": [],
        "isUniqueToday": false
      }
    },
    "catalog": {
      "id": 40,
      "section": "home",
      "badge": "Bajo Pedido",
      "imageUrl": "EdDeli/yoyos-jnw46.png",
      "position": 0,
      "isActive": true,
      "title": "Yoyos",
      "subtitle": null,
      "priceOverride": 0.5,
      "displayName": "Yoyos",
      "displayPrice": 0.5,
      "minOrderQty": null,
      "product": {
        "id": 65,
        "name": "Yoyos",
        "primaryImageUrl": "EdDeli/yoyos-jnw46.png",
        "unitAbbr": "un",
        "desc": null,
        "standardWeightGrams": 0,
        "categorySlug": "panaderia",
        "type": "final",
        "price": 0.5,
        "status": "Listo ahora",
        "tags": [],
        "wholesaleRules": [],
        "isUniqueToday": false
      }
    }
  }
};
