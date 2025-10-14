# Backend Implementation TODO

## Current Status
- ✅ **User Model**: Complete with authentication, email verification
- ❌ **Deal Models**: Not implemented yet
- ❌ **Deal Serializers**: Not implemented yet
- ❌ **Deal API Endpoints**: Not implemented yet

## Required Django Models

### 1. DealCategory Model
```python
class DealCategory(models.Model):
    name = models.CharField(max_length=100)
    slug = models.SlugField(unique=True)
    icon = models.CharField(max_length=10, blank=True)  # Emoji
    color = models.CharField(max_length=7, blank=True)  # Hex color
    created_at = models.DateTimeField(auto_now_add=True)
```

### 2. Deal Model
```python
class Deal(models.Model):
    title = models.CharField(max_length=200)
    description = models.TextField()
    current_price = models.DecimalField(max_digits=10, decimal_places=2)
    original_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    currency = models.CharField(max_length=3, default='MAD')
    merchant = models.CharField(max_length=100)
    location = models.CharField(max_length=100)
    category = models.ForeignKey(DealCategory, on_delete=models.CASCADE)
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    image = models.ImageField(upload_to='deals/', null=True, blank=True)
    proof = models.ImageField(upload_to='proofs/', null=True, blank=True)
    is_verified = models.BooleanField(default=False)
    is_expired = models.BooleanField(default=False)
    expires_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

### 3. DealVote Model
```python
class DealVote(models.Model):
    VOTE_CHOICES = [
        ('up', 'Upvote'),
        ('down', 'Downvote'),
    ]
    
    deal = models.ForeignKey(Deal, on_delete=models.CASCADE, related_name='votes')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    vote_type = models.CharField(max_length=4, choices=VOTE_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        unique_together = ['deal', 'user']
```

### 4. DealComment Model
```python
class DealComment(models.Model):
    deal = models.ForeignKey(Deal, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField(max_length=500)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True)
    is_edited = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
```

## Required Serializers

### 1. DealCategorySerializer
```python
class DealCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = DealCategory
        fields = ['id', 'name', 'slug', 'icon', 'color', 'created_at']
```

### 2. DealSerializer
```python
class DealSerializer(serializers.ModelSerializer):
    author = UserSerializer(read_only=True)
    category = DealCategorySerializer(read_only=True)
    vote_count = serializers.SerializerMethodField()
    comment_count = serializers.SerializerMethodField()
    user_vote = serializers.SerializerMethodField()
    discount_percentage = serializers.SerializerMethodField()
    
    class Meta:
        model = Deal
        fields = [
            'id', 'title', 'description', 'current_price', 'original_price',
            'currency', 'merchant', 'location', 'category', 'author',
            'image', 'proof', 'is_verified', 'is_expired', 'expires_at',
            'created_at', 'updated_at', 'vote_count', 'comment_count',
            'user_vote', 'discount_percentage'
        ]
```

### 3. DealVoteSerializer
```python
class DealVoteSerializer(serializers.ModelSerializer):
    class Meta:
        model = DealVote
        fields = ['id', 'deal', 'user', 'vote_type', 'created_at', 'updated_at']
```

### 4. DealCommentSerializer
```python
class DealCommentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = DealComment
        fields = ['id', 'deal', 'user', 'content', 'parent', 'is_edited', 'created_at', 'updated_at']
```

## Required API Endpoints

### Deals
- `GET /api/deals/` - List deals with filtering/pagination
- `POST /api/deals/` - Create new deal
- `GET /api/deals/{id}/` - Get deal detail
- `PUT /api/deals/{id}/` - Update deal (author only)
- `DELETE /api/deals/{id}/` - Delete deal (author only)

### Categories
- `GET /api/categories/` - List all categories

### Votes
- `POST /api/deals/{id}/vote/` - Vote on deal
- `DELETE /api/deals/{id}/vote/` - Remove vote

### Comments
- `GET /api/deals/{id}/comments/` - List deal comments
- `POST /api/deals/{id}/comments/` - Add comment
- `PUT /api/comments/{id}/` - Update comment (author only)
- `DELETE /api/comments/{id}/` - Delete comment (author only)

## Frontend Integration

Once Django models are implemented:

1. **Update TypeScript interfaces** in `packages/schemas/src/deals.ts` to match exact serializer field names
2. **Replace mock data** with real API calls in `packages/queries/src/`
3. **Update mobile app** to use real API endpoints instead of mock data
4. **Add proper error handling** for API responses
5. **Implement image upload** for deal creation

## Priority Order

1. **DealCategory** model + serializer + API
2. **Deal** model + serializer + API  
3. **DealVote** model + serializer + API
4. **DealComment** model + serializer + API
5. **Frontend integration** with real APIs
