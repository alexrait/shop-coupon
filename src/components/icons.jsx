import React from 'react';

// Custom Icon Wrapper
const Icon = ({ children, className = '', size = 24, fill = "none", stroke = "currentColor", strokeWidth = 2, ...props }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={`inline-block align-middle ${className}`}
        {...props}
    >
        {children}
    </svg>
);

// 20 Unique Icons for Vault Cart
export const Icons = {
    Vault: (props) => (
        <Icon {...props}>
            <rect x="3" y="11" width="18" height="10" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            <circle cx="12" cy="16" r="1" />
        </Icon>
    ),
    Cart: (props) => (
        <Icon {...props}>
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </Icon>
    ),
    Coupon: (props) => (
        <Icon {...props}>
            <path d="M15 5V7M15 11V13M15 17V19M5 5C3.34315 5 2 6.34315 2 8V10C3.10457 10 4 10.8954 4 12C4 13.1046 3.10457 14 2 14V16C2 17.6569 3.34315 19 5 19H19C20.6569 19 22 17.6569 22 16V14C20.8954 14 20 13.1046 20 12C20 10.8954 20.8954 10 22 10V8C22 6.34315 20.6569 5 19 5H5Z" />
        </Icon>
    ),
    Shield: (props) => (
        <Icon {...props}>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        </Icon>
    ),
    Key: (props) => (
        <Icon {...props}>
            <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.778-7.778zM12 2l.71 7.29L12 11l4-4 2 2-2 2-2-4-2 2-2 2 2 2z" />
        </Icon>
    ),
    History: (props) => (
        <Icon {...props}>
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
            <path d="M12 7v5l4 2" />
        </Icon>
    ),
    Share: (props) => (
        <Icon {...props}>
            <circle cx="18" cy="5" r="3" />
            <circle cx="6" cy="12" r="3" />
            <circle cx="18" cy="19" r="3" />
            <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
            <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </Icon>
    ),
    Scan: (props) => (
        <Icon {...props}>
            <path d="M3 7V5a2 2 0 0 1 2-2h2m10 0h2a2 2 0 0 1 2 2v2m0 10v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
            <line x1="7" y1="12" x2="17" y2="12" />
        </Icon>
    ),
    Tag: (props) => (
        <Icon {...props}>
            <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
            <line x1="7" y1="7" x2="7.01" y2="7" />
        </Icon>
    ),
    Discount: (props) => (
        <Icon {...props}>
            <circle cx="12" cy="12" r="10" />
            <path d="M16 8l-8 8" />
            <circle cx="9.5" cy="9.5" r=".5" />
            <circle cx="14.5" cy="14.5" r=".5" />
        </Icon>
    ),
    Lock: (props) => (
        <Icon {...props}>
            <rect x="3" y="11" width="18" height="10" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </Icon>
    ),
    LockOpen: (props) => (
        <Icon {...props}>
            <rect x="3" y="11" width="18" height="10" rx="2" />
            <path d="M7 11V7a5 5 0 0 1 9.9-1" />
        </Icon>
    ),
    Add: (props) => (
        <Icon {...props}>
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
        </Icon>
    ),
    UserPlus: (props) => (
        <Icon {...props}>
            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
            <circle cx="8.5" cy="7" r="4" />
            <line x1="20" y1="8" x2="20" y2="14" />
            <line x1="23" y1="11" x2="17" y2="11" />
        </Icon>
    ),
    Logout: (props) => (
        <Icon {...props}>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <polyline points="16 17 21 12 16 7" />
            <line x1="21" y1="12" x2="9" y2="12" />
        </Icon>
    ),
    Check: (props) => (
        <Icon {...props}>
            <polyline points="20 6 9 17 4 12" />
        </Icon>
    ),
    Trash: (props) => (
        <Icon {...props}>
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </Icon>
    ),
    Edit: (props) => (
        <Icon {...props}>
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </Icon>
    ),
    Alert: (props) => (
        <Icon {...props}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
        </Icon>
    ),
    Folder: (props) => (
        <Icon {...props}>
            <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
        </Icon>
    ),
    Image: (props) => (
        <Icon {...props}>
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
        </Icon>
    ),
    Grip: (props) => (
        <Icon {...props}>
            <circle cx="9" cy="5" r="1" />
            <circle cx="9" cy="12" r="1" />
            <circle cx="9" cy="19" r="1" />
            <circle cx="15" cy="5" r="1" />
            <circle cx="15" cy="12" r="1" />
            <circle cx="15" cy="19" r="1" />
        </Icon>
    ),
    ChevronLeft: (props) => (
        <Icon {...props}>
            <polyline points="15 18 9 12 15 6" />
        </Icon>
    ),
    ChevronRight: (props) => (
        <Icon {...props}>
            <polyline points="9 18 15 12 9 6" />
        </Icon>
    ),
    ShoppingCart: (props) => (
        <Icon {...props}>
            <circle cx="9" cy="21" r="1" />
            <circle cx="20" cy="21" r="1" />
            <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </Icon>
    ),
};
