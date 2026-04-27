# Design and Implementation of a Personal Blog System with Content Management and Preview Features

## Proposal Report

### Motivation & Objectives
The goal of this project is to build a personal blog system from scratch to understand how data is managed and how a complete system is designed. This project also aims to address practical issues in content handling, especially when dealing with formatted content such as HTML.

The main objectives include:

- Implementing a basic blog system for creating, editing, and viewing posts
- Designing a content preview mechanism for better readability
- Handling issues related to storing and displaying HTML content
- Applying data structures and programming logic in a real-world application

### Competitor Analysis

When evaluating blogging platforms from the perspective of individual writers, several key aspects emerge, including writing experience, content ownership, ease of use, and system flexibility.

From the perspective of writing experience, platforms such as Medium focus heavily on simplicity and minimalism. Its editor is designed to reduce distractions and allow users to concentrate entirely on content creation. Ghost follows a similar philosophy but provides a slightly more advanced editing and publishing workflow, including support for structured content and integrations such as newsletters. In contrast, WordPress offers a more feature-rich editor, but the experience can feel more complex due to its extensive options and plugin ecosystem. Static site solutions such as GitHub Pages, which typically rely on Markdown and static site generators, provide a more technical writing workflow that may interrupt the creative process for non-technical users.

Content ownership is another critical factor. Medium operates as a platform-based service where content is published within its ecosystem, meaning users have limited control over distribution, presentation, and long-term accessibility. In contrast, WordPress and Ghost both support self-hosting, allowing users to fully control their data, domain, and content management. GitHub Pages also provides complete ownership, as all content is managed directly within a code repository. However, this level of control often comes with increased technical responsibility.

Ease of use further differentiates these platforms. Medium provides the lowest barrier to entry, requiring no setup or technical knowledge. WordPress, while powerful, requires configuration, hosting, and maintenance, which can be challenging for beginners. Ghost attempts to balance these factors by offering a streamlined setup process while still supporting advanced features. In contrast, static site approaches such as GitHub Pages require familiarity with development workflows, including version control and build processes, making them less accessible to general users. This demonstrates how usability often decreases as flexibility and control increase.

In terms of customization and extensibility, WordPress stands out due to its extensive plugin and theme ecosystem, enabling users to build highly customized websites beyond simple blogs. Ghost provides a more focused set of features centered around publishing and audience management, offering moderate customization without excessive complexity. Medium offers very limited customization, prioritizing consistency across its platform. Static site solutions provide high flexibility through code-level customization, but require significant technical effort.

The following table summarizes the key differences among these platforms:

| Platform        | Writing Experience | Content Ownership | Ease of Use | Customization | Technical Requirement |
|----------------|------------------|------------------|-------------|---------------|----------------------|
| Medium         | Very High        | Low              | Very High   | Very Low      | Very Low             |
| WordPress      | Medium           | Very High        | Medium-Low  | Very High     | Medium-High          |
| Ghost          | High             | High             | Medium      | Medium        | Medium               |
| GitHub Pages   | Low-Medium       | Very High        | Low         | High          | High                 |

Overall, based on the factors discussed above, this system aims to provide a balanced blogging solution that integrates the strengths of existing platforms. It seeks to retain the simplicity and focused writing experience of Medium, the high level of content ownership and flexibility offered by WordPress, and the streamlined, modern publishing workflow emphasized by Ghost. At the same time, it draws inspiration from static site approaches in terms of full control over content and system structure.

### Expected Features
This system is designed to support basic blog functionalities, including post management, content display, and preview mechanisms. Users will be able to:

- Create, edit, and delete posts
- Browse a list of posts on the homepage (card-based layout)
- View detailed content on separate pages

A key feature of this system is the content preview mechanism, which displays a portion of each post. Special attention will be given to handling issues caused by truncating HTML content, ensuring previews remain readable and correctly formatted.

Additional features may include:

- Keyword-based search
- Categorization using tags
- Sorting posts based on time or other criteria

### Technologies
The project will use a combination of frontend, backend, and data storage technologies:

- **Frontend:** React, HTML, and CSS for a responsive and interactive UI
- **Backend:** Node.js with Express for server-side logic and API endpoints
- **Data Storage:** JSON files or a lightweight database (e.g., SQLite)
- **Tools:** Git for version control, Visual Studio Code as the development environment

These technologies are chosen to provide a simple, modular, and maintainable architecture, allowing easy implementation of features such as content preview and post management.

### Prototype Validation

The current prototype is designed to validate several core assumptions of the system.

First, it verifies whether a lightweight full-stack architecture using React, Node.js, and SQLite is sufficient to support basic blog functionalities, including creating, editing, deleting, and retrieving posts. This helps evaluate whether a simple database structure can effectively handle content management without requiring a more complex database system.

Second, the prototype tests the system’s ability to correctly handle rich text content. Since blog posts are stored in HTML format generated by a rich text editor, it is important to ensure that the frontend can safely and correctly render this content without breaking layout or introducing formatting issues.

Third, the system validates the integration of image uploading and management through Cloudinary. This includes verifying whether images can be uploaded from the editor, embedded into blog content, and correctly displayed when retrieving posts. Additionally, it checks whether associated images can be properly managed when a post is deleted.

Overall, this prototype aims to confirm that a simple but fully functional blogging system can be implemented while maintaining content integrity, media handling, and basic user interaction flows.

---

## Prototype Report

### Current Progress

The current system has been implemented as a functional personal blog prototype using a full-stack architecture. The frontend is developed with React, TypeScript, and Vite, while the backend is built using Node.js with Express. A lightweight SQLite database is used for data persistence.

On the frontend side, the system currently supports a complete blog browsing experience, including a post listing page and a detailed post view page. Users are able to browse all posts and filter them by categories. A post creation page has also been implemented, integrating the ReactQuill rich text editor, allowing users to write content in a format similar to modern blogging platforms. The editor supports structured input including titles, categories, and rich text formatting.

In addition, image uploading functionality has been integrated through Cloudinary. Images uploaded from the editor are stored in the cloud and returned as URLs, which are then embedded into the post content. This allows each post to contain a mixture of text and images.

A basic role-based access control mechanism has also been implemented on the frontend, where only users with an admin role are allowed to create, edit, and delete posts.

On the backend, a complete set of CRUD APIs has been developed, supporting the creation, retrieval, updating, and deletion of posts. The system also supports querying posts by category. The database schema is implemented using SQLite, containing a simple posts table that stores the title, content, and category of each post.

Overall, the current prototype already supports a complete blogging workflow, from content creation to storage, display, and deletion.

### Challenges Encountered
One of the main challenges encountered during the development of the rich text content feature was handling the storage and rendering of HTML-based content. Since the blog system uses ReactQuill to generate rich text, the resulting content is stored in HTML format within the database. This introduced difficulties in rendering the content correctly on the frontend.

To address this issue, I adopted the use of React’s `dangerouslySetInnerHTML` to render HTML content directly within the component. Through this approach, the system is able to correctly display formatted rich text content while preserving the original structure created in the editor.

Another challenge was encountered during the implementation of the image management feature. Since images uploaded through the editor are stored in Cloudinary and embedded as URLs inside the HTML content, deleting a post required more than simply removing the database record. The system needed to identify and extract the corresponding image identifiers from the HTML content.

To solve this problem, I implemented an HTML parsing approach using regular expressions to extract Cloudinary public IDs from the stored content. These IDs were then used with the Cloudinary API to delete the associated images. Through this approach, the system is able to maintain consistency between the database and external image storage when posts are deleted.

### Next Steps
The next stage of development will focus on enhancing system functionality and improving user experience. A search feature will be implemented to allow users to quickly locate relevant posts using keywords, improving content discoverability.

In addition, further UI and UX improvements will be made to the post listing and detail pages. This includes improving layout structure, adjusting content width for better readability, and enhancing overall visual consistency.

From a functional perspective, a more robust authentication mechanism will be considered, potentially replacing the current simple role-based system with token-based authentication to improve security and scalability.

Finally, further system optimizations may include introducing pagination to handle a growing number of posts more efficiently, as well as improving data structure design to ensure better scalability in the long term.

---

## Final Report

### 專案說明
<!-- 完整描述你的專案做了什麼 -->

### 使用方式
<!-- 如何編譯、執行、使用你的程式 -->

### 與課程的關聯總結
<!-- 總結你的專題與進階程式設計及資料結構課程之間的關聯 -->
