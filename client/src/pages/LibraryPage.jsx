import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./LibraryPage.module.css";
import materialService from "../services/materialService";
import goalService from "../services/goalService";
import { 
  MdDescription, 
  MdVisibility, 
  MdFavorite, 
  MdBookmark,
  MdSearch,
  MdFilterList,
  MdSort,
  MdRefresh,
  MdPictureAsPdf,
  MdSlideshow,
  MdImage,
  MdVideoLibrary,
  MdArticle,
  MdAutoAwesome
} from "react-icons/md";

export default function LibraryPage() {
  const navigate = useNavigate();
  
  // Data state
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Filter and search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [materialType, setMaterialType] = useState("");
  
  // Pagination state
  const [pagination, setPagination] = useState({
    current: 1,
    pages: 1,
    total: 0,
    limit: 12
  });

  // Fetch materials
  const fetchMaterials = useCallback(async () => {
    setLoading(true);
    setError("");
    
    try {
      const params = {
        page: pagination.current,
        limit: pagination.limit,
        sortBy,
        sortOrder,
      };
      
      if (searchQuery) params.search = searchQuery;
      if (materialType && materialType !== 'AI Generated') params.materialType = materialType;

      let response;
      if (materialType === 'AI Generated') {
        const aiParams = {
          page: pagination.current,
          limit: pagination.limit,
          sortBy,
          sortOrder,
        };
        if (searchQuery) aiParams.search = searchQuery;
        response = await goalService.getPublicNotes(aiParams);
        const mapped = (response.data || []).map(note => mapAiNote(note));
        setMaterials(mapped);
        setPagination(prev => ({ ...prev, ...response.pagination }));
      } else if (!materialType) {
        // "All" — fetch both regular materials and AI notes in parallel
        const aiParams = { page: 1, limit: Math.floor(pagination.limit / 2), sortBy, sortOrder };
        if (searchQuery) aiParams.search = searchQuery;

        const [matRes, aiRes] = await Promise.allSettled([
          materialService.getMaterials({ ...params, limit: pagination.limit }),
          goalService.getPublicNotes(aiParams)
        ]);

        const regularMaterials = matRes.status === 'fulfilled' ? (matRes.value.data || []) : [];
        const aiMaterials = aiRes.status === 'fulfilled' ? (aiRes.value.data || []).map(n => mapAiNote(n)) : [];

        // Merge and sort by date
        const merged = [...regularMaterials, ...aiMaterials].sort((a, b) => {
          const dateA = new Date(a.createdAt || 0).getTime();
          const dateB = new Date(b.createdAt || 0).getTime();
          return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
        });

        setMaterials(merged);
        if (matRes.status === 'fulfilled') {
          setPagination(prev => ({ ...prev, ...matRes.value.pagination }));
        }
      } else {
        response = await materialService.getMaterials(params);
        setMaterials(response.data || []);
        setPagination(prev => ({ ...prev, ...response.pagination }));
      }
    } catch (err) {
      setError("Failed to load materials. Please try again.");
      console.error("Fetch materials error:", err);
    } finally {
      setLoading(false);
    }
  }, [pagination.current, pagination.limit, searchQuery, sortBy, sortOrder, materialType]);

  // Fetch on mount and when filters change
  useEffect(() => {
    fetchMaterials();
  }, [fetchMaterials]);

  // Handle search submit
  const handleSearch = (e) => {
    e.preventDefault();
    setSearchQuery(searchInput);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  // Handle sort change
  const handleSortChange = (newSortBy) => {
    if (sortBy === newSortBy) {
      setSortOrder(prev => prev === "desc" ? "asc" : "desc");
    } else {
      setSortBy(newSortBy);
      setSortOrder("desc");
    }
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  // Handle type filter
  const handleTypeFilter = (type) => {
    setMaterialType(prev => prev === type ? "" : type);
    setPagination(prev => ({ ...prev, current: 1 }));
  };

  // Handle page change
  const handlePageChange = (page) => {
    setPagination(prev => ({ ...prev, current: page }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  // Map AI note to material-like shape
  const mapAiNote = (note) => ({
    _id: note._id,
    title: note.textContent?.title || note.topic || 'AI Notes',
    subject: note.topic || note.goal?.subject || '',
    description: note.textContent?.keyPoints?.[0] || note.textContent?.content?.substring(0, 120) || '',
    author: note.goal?.user || {},
    createdAt: note.publishedAt || note.createdAt,
    materialType: 'AI Generated',
    views: note.stats?.views || 0,
    likesCount: note.stats?.likes || 0,
    savesCount: 0,
    _isAiNote: true,
    _goalId: note.goal?._id
  });

  return (
    <div className={styles.page}>
      {/* Header with search */}
      <header className={styles.header}>
        <form className={styles.searchContainer} onSubmit={handleSearch}>
          <MdSearch className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            placeholder="Search materials by title, subject, or keywords..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          {searchInput && (
            <button 
              type="button" 
              className={styles.clearSearch}
              onClick={() => {
                setSearchInput("");
                setSearchQuery("");
                setPagination(prev => ({ ...prev, current: 1 }));
              }}
            >
              ×
            </button>
          )}
        </form>
        <Link to="/app/upload-material" className={styles.uploadButton} style={materialType === 'AI Generated' ? { display: 'none' } : {}}>
          Upload Material
        </Link>
      </header>

      {/* Filters row */}
      <section className={styles.filtersRow}>
        <div className={styles.typeFilters}>
          <button 
            className={`${styles.filterChip} ${!materialType ? styles.filterChipActive : ''}`}
            onClick={() => setMaterialType("")}
          >
            All
          </button>
          <button 
            className={`${styles.filterChip} ${materialType === 'PDF' ? styles.filterChipActive : ''}`}
            onClick={() => handleTypeFilter('PDF')}
          >
            <MdPictureAsPdf /> PDF
          </button>
          <button 
            className={`${styles.filterChip} ${materialType === 'Slides' ? styles.filterChipActive : ''}`}
            onClick={() => handleTypeFilter('Slides')}
          >
            <MdSlideshow /> Slides
          </button>
          <button 
            className={`${styles.filterChip} ${materialType === 'Notes' ? styles.filterChipActive : ''}`}
            onClick={() => handleTypeFilter('Notes')}
          >
            <MdArticle /> Notes
          </button>
          <button 
            className={`${styles.filterChip} ${materialType === 'Video' ? styles.filterChipActive : ''}`}
            onClick={() => handleTypeFilter('Video')}
          >
            <MdVideoLibrary /> Video
          </button>
          <button 
            className={`${styles.filterChip} ${materialType === 'Image' ? styles.filterChipActive : ''}`}
            onClick={() => handleTypeFilter('Image')}
          >
            <MdImage /> Image
          </button>
          <button 
            className={`${styles.filterChip} ${materialType === 'AI Generated' ? styles.filterChipActive : ''}`}
            onClick={() => handleTypeFilter('AI Generated')}
          >
            <MdAutoAwesome /> AI Generated
          </button>
        </div>

        <div className={styles.sortOptions}>
          <button 
            className={`${styles.sortChip} ${sortBy === 'createdAt' ? styles.sortChipActive : ''}`}
            onClick={() => handleSortChange('createdAt')}
          >
            {sortBy === 'createdAt' && (sortOrder === 'desc' ? '↓' : '↑')} Newest
          </button>
          <button 
            className={`${styles.sortChip} ${sortBy === 'views' ? styles.sortChipActive : ''}`}
            onClick={() => handleSortChange('views')}
          >
            {sortBy === 'views' && (sortOrder === 'desc' ? '↓' : '↑')} Views
          </button>
          <button 
            className={`${styles.sortChip} ${sortBy === 'likesCount' ? styles.sortChipActive : ''}`}
            onClick={() => handleSortChange('likesCount')}
          >
            {sortBy === 'likesCount' && (sortOrder === 'desc' ? '↓' : '↑')} Likes
          </button>
        </div>
      </section>

      {/* Results info */}
      {searchQuery && (
        <div className={styles.resultsInfo}>
          Showing results for "{searchQuery}" ({pagination.total} found)
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className={styles.errorState}>
          <p>{error}</p>
          <button onClick={fetchMaterials} className={styles.retryButton}>
            <MdRefresh /> Retry
          </button>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Loading materials...</p>
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && materials.length === 0 && (
        <div className={styles.emptyState}>
          <MdDescription className={styles.emptyIcon} />
          <h3>No materials found</h3>
          <p>
            {searchQuery 
              ? "Try different search terms or clear filters"
              : "Be the first to upload study materials!"}
          </p>
          <Link to="/app/upload-material" className={styles.uploadButtonLarge}>
            Upload Material
          </Link>
        </div>
      )}

      {/* Cards grid */}
      {!loading && !error && materials.length > 0 && (
        <>
          <section className={styles.grid}>
            {materials.map((material) => (
              <ResourceCard
                key={material._id}
                id={material._id}
                title={material.title}
                tag={material.subject || material.tag}
                description={material.description}
                author={material._isAiNote ? (material.author?.username || material.author?.profile?.firstName || 'Unknown') : (material.author?.username || 'Unknown')}
                uni={material._isAiNote ? (material.author?.profile?.university || '') : (material.author?.university || '')}
                date={formatDate(material.createdAt)}
                type={material.materialType}
                views={material.views || 0}
                likes={material.likesCount || 0}
                saves={material.savesCount || 0}
                isAiNote={material._isAiNote}
                goalId={material._goalId}
              />
            ))}
          </section>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className={styles.pagination}>
              <button 
                className={styles.pageButton}
                disabled={pagination.current === 1}
                onClick={() => handlePageChange(pagination.current - 1)}
              >
                Previous
              </button>
              
              <div className={styles.pageNumbers}>
                {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                  .filter(page => {
                    // Show first, last, and pages around current
                    return page === 1 || 
                           page === pagination.pages || 
                           Math.abs(page - pagination.current) <= 1;
                  })
                  .map((page, index, array) => (
                    <span key={page}>
                      {index > 0 && array[index - 1] !== page - 1 && (
                        <span className={styles.pageEllipsis}>...</span>
                      )}
                      <button
                        className={`${styles.pageNumber} ${pagination.current === page ? styles.pageNumberActive : ''}`}
                        onClick={() => handlePageChange(page)}
                      >
                        {page}
                      </button>
                    </span>
                  ))}
              </div>
              
              <button 
                className={styles.pageButton}
                disabled={pagination.current === pagination.pages}
                onClick={() => handlePageChange(pagination.current + 1)}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// Resource Card Component
function ResourceCard({
  id,
  title,
  tag,
  description,
  author,
  uni,
  date,
  type,
  views,
  likes,
  saves,
  isAiNote,
  goalId,
}) {
  const getTypeIcon = () => {
    switch (type) {
      case 'PDF': return <MdPictureAsPdf size={20} style={{ color: '#dc2626' }} />;
      case 'Slides': return <MdSlideshow size={20} style={{ color: '#f59e0b' }} />;
      case 'Video': return <MdVideoLibrary size={20} style={{ color: '#8b5cf6' }} />;
      case 'Image': return <MdImage size={20} style={{ color: '#10b981' }} />;
      case 'AI Generated': return <MdAutoAwesome size={20} style={{ color: '#f59e0b' }} />;
      default: return <MdDescription size={20} style={{ color: '#0073a0' }} />;
    }
  };

  const cardContent = (
    <article className={styles.card}>
      <div className={styles.cardHeaderRow}>
        <div className={styles.iconCircle}>
          {getTypeIcon()}
        </div>
        <div className={styles.cardTitleBlock}>
          <h2 className={styles.cardTitle}>{title}</h2>
          <span className={styles.tagChip}>{tag}</span>
        </div>
      </div>

      <p className={styles.cardDescription}>
        {description || 'No description available'}
      </p>

      <div className={styles.cardMetaRow}>
        <span className={styles.cardMetaText}>
          {author}{uni ? ` · ${uni}` : ''}
        </span>
      </div>

      <div className={styles.cardFooter}>
        <div className={styles.footerLeft}>
          <span className={styles.footerMeta}>{date}</span>
          <span className={styles.typeBadge}>{type}</span>
        </div>
        <div className={styles.footerStats}>
          <span className={styles.statItem}>
            <MdVisibility size={16} style={{ color: '#b18fffff' }} /> {views}
          </span>
          <span className={styles.statItem}>
            <MdFavorite size={16} style={{ color: '#ff6f6fff' }} /> {likes}
          </span>
          <span className={styles.statItem}>
            <MdBookmark size={16} style={{ color: '#ffc869ff' }} /> {saves}
          </span>
        </div>
      </div>
    </article>
  );

  if (isAiNote) {
    return (
      <Link to={id ? `/app/ai-note/${id}` : goalId ? `/app/goals/${goalId}` : '#'} className={styles.cardLink}>
        {cardContent}
      </Link>
    );
  }

  return (
    <Link to={`/app/note/${id}`} className={styles.cardLink}>
      {cardContent}
    </Link>
  );
}
