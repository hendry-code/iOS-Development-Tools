import { SchemaField } from './mockDataGenerator';

export interface SchemaPreset {
    id: string;
    name: string;
    description: string;
    icon: string; // lucide icon name
    fields: SchemaField[];
}

export const SCHEMA_PRESETS: SchemaPreset[] = [
    {
        id: 'user-profile',
        name: 'User Profile',
        description: 'Standard user entity with personal info',
        icon: 'User',
        fields: [
            { id: 'p1_1', name: 'id', type: 'uuid' },
            { id: 'p1_2', name: 'firstName', type: 'firstName' },
            { id: 'p1_3', name: 'lastName', type: 'lastName' },
            { id: 'p1_4', name: 'email', type: 'email' },
            { id: 'p1_5', name: 'avatar', type: 'avatar' },
            { id: 'p1_6', name: 'phone', type: 'phone' },
            { id: 'p1_7', name: 'isActive', type: 'boolean' },
            { id: 'p1_8', name: 'createdAt', type: 'date' },
        ],
    },
    {
        id: 'product-catalog',
        name: 'Product Catalog',
        description: 'E-commerce product listing',
        icon: 'ShoppingBag',
        fields: [
            { id: 'p2_1', name: 'id', type: 'uuid' },
            { id: 'p2_2', name: 'name', type: 'lorem' },
            { id: 'p2_3', name: 'price', type: 'amount', min: 5, max: 500 },
            { id: 'p2_4', name: 'category', type: 'customList', customValues: ['Electronics', 'Clothing', 'Home', 'Sports', 'Books'] },
            { id: 'p2_5', name: 'imageUrl', type: 'image' },
            { id: 'p2_6', name: 'inStock', type: 'boolean' },
            { id: 'p2_7', name: 'rating', type: 'float', min: 1, max: 5, precision: 1 },
        ],
    },
    {
        id: 'blog-post',
        name: 'Blog Post',
        description: 'Content management article',
        icon: 'FileText',
        fields: [
            { id: 'p3_1', name: 'id', type: 'uuid' },
            { id: 'p3_2', name: 'title', type: 'lorem' },
            { id: 'p3_3', name: 'slug', type: 'username' },
            { id: 'p3_4', name: 'author', type: 'name' },
            { id: 'p3_5', name: 'body', type: 'paragraph' },
            { id: 'p3_6', name: 'publishedAt', type: 'date' },
            { id: 'p3_7', name: 'tags', type: 'customList', customValues: ['tech', 'design', 'business', 'lifestyle'], isArray: true, arrayCount: 3 },
        ],
    },
    {
        id: 'order-transaction',
        name: 'Order / Transaction',
        description: 'Purchase order with line items',
        icon: 'Receipt',
        fields: [
            { id: 'p4_1', name: 'orderId', type: 'uuid' },
            {
                id: 'p4_2', name: 'customer', type: 'object', children: [
                    { id: 'p4_2_1', name: 'name', type: 'name' },
                    { id: 'p4_2_2', name: 'email', type: 'email' },
                ]
            },
            {
                id: 'p4_3', name: 'items', type: 'array', arrayCount: 3, children: [
                    { id: 'p4_3_1', name: 'product', type: 'lorem' },
                    { id: 'p4_3_2', name: 'quantity', type: 'integer', min: 1, max: 10 },
                    { id: 'p4_3_3', name: 'unitPrice', type: 'amount', min: 5, max: 200 },
                ]
            },
            { id: 'p4_4', name: 'totalAmount', type: 'amount', min: 20, max: 2000 },
            { id: 'p4_5', name: 'status', type: 'customList', customValues: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'] },
            { id: 'p4_6', name: 'createdAt', type: 'date' },
        ],
    },
    {
        id: 'core-data-entity',
        name: 'iOS Core Data Entity',
        description: 'Typical Core Data managed object',
        icon: 'Database',
        fields: [
            { id: 'p5_1', name: 'id', type: 'uuid' },
            { id: 'p5_2', name: 'entityName', type: 'lorem', maxLength: 30 },
            { id: 'p5_3', name: 'sortOrder', type: 'integer', min: 0, max: 999 },
            { id: 'p5_4', name: 'isSynced', type: 'boolean' },
            { id: 'p5_5', name: 'createdAt', type: 'date' },
            { id: 'p5_6', name: 'updatedAt', type: 'date' },
        ],
    },
    {
        id: 'api-response',
        name: 'API Response',
        description: 'REST API response wrapper',
        icon: 'Globe',
        fields: [
            { id: 'p6_1', name: 'status', type: 'integer', min: 200, max: 200 },
            { id: 'p6_2', name: 'message', type: 'lorem' },
            {
                id: 'p6_3', name: 'data', type: 'object', children: [
                    {
                        id: 'p6_3_1', name: 'items', type: 'array', arrayCount: 5, children: [
                            { id: 'p6_3_1_1', name: 'id', type: 'uuid' },
                            { id: 'p6_3_1_2', name: 'name', type: 'name' },
                            { id: 'p6_3_1_3', name: 'value', type: 'float', min: 0, max: 100, precision: 2 },
                        ]
                    },
                    { id: 'p6_3_2', name: 'total', type: 'integer', min: 1, max: 100 },
                ]
            },
            { id: 'p6_4', name: 'timestamp', type: 'date' },
        ],
    },
];
