import React, { Component, Fragment } from 'react';

import Post from '../../components/Feed/Post/Post';
import Button from '../../components/Button/Button';
import FeedEdit from '../../components/Feed/FeedEdit/FeedEdit';
import Input from '../../components/Form/Input/Input';
import Paginator from '../../components/Paginator/Paginator';
import Loader from '../../components/Loader/Loader';
import ErrorHandler from '../../components/ErrorHandler/ErrorHandler';
import './Feed.css';
//firebase storage 
import { storage } from '../../config/firebase-config';

class Feed extends Component {
  state = {
    isEditing: false,
    posts: [],
    totalPosts: 0,
    editPost: null,
    status: '',
    postPage: 1,
    postsLoading: true,
    editLoading: false,
    uploading : 0
  };

  componentDidMount() {
    fetch('URL',{
      headers : {
        Authorization : 'Bearer '+ this.props.token
      }
    })
      .then(res => {
        if (res.status !== 200) {
          throw new Error('Failed to fetch user status.');
        }
        return res.json();
      })
      .then(resData => {
        this.setState({ status: resData.status });
      })
      .catch(this.catchError);
   console.log('did mount')
    this.loadPosts();
  }

  loadPosts = direction => {
    if (direction) {
      this.setState({ postsLoading: true, posts: [] });
    }
    let page = this.state.postPage;
    if (direction === 'next') {
      page++;
      this.setState({ postPage: page });
    }
    if (direction === 'previous') {
      page--;
      this.setState({ postPage: page });
    }
    fetch(`https://lit-cliffs-27689.herokuapp.com/feed/posts?page=${page}`,{
      headers : {
        Authorization : 'Bearer '+ this.props.token
      }
    })
      .then(res => {
        if (res.status !== 200) {
          throw new Error('Failed to fetch posts.');
        }
        return res.json();
      })
      .then(resData => {
        this.setState({
          posts: resData.posts,
          totalPosts: resData.totalItems,
          postsLoading: false
        });
      })
      .catch(this.catchError);
  };

  statusUpdateHandler = event => {
    event.preventDefault();
    fetch('URL',{
      headers:{
        Authorization : 'Bearer '+ this.props.token
      }
    })
      .then(res => {
        if (res.status !== 200 && res.status !== 201) {
          throw new Error("Can't update status!");
        }
        return res.json();
      })
      .then(resData => {
        console.log(resData);
      })
      .catch(this.catchError);
  };

  newPostHandler = () => {
    this.setState({ isEditing: true });
  };

  startEditPostHandler = postId => {
    this.setState(prevState => {
      const loadedPost = { ...prevState.posts.find(p => p._id === postId) };

      return {
        isEditing: true,
        editPost: loadedPost
      };
    });
  };

  cancelEditHandler = () => {
    this.setState({ isEditing: false, editPost: null });
  };

  finishEditHandler = postData => {
   
    this.setState({
      editLoading: true
    });
    // Set up data (with image!)
    let url = 'https://lit-cliffs-27689.herokuapp.com/feed/create-post';
    let method = 'POST';
    if (this.state.editPost) {
      url = `https://lit-cliffs-27689.herokuapp.com/feed/update-post/${this.state.editPost._id}`;
      method = "PUT";
    }
    if(!this.state.editPost){
      let currentImageName = "firebase-image-"+Date.now();
      let uploadImage = storage.ref(`posts/images/${currentImageName}`).put(postData.image);
      uploadImage.on('state_changed',
          (snapshot) => { 
              var progress = snapshot.bytesTransferred / snapshot.totalBytes * 100;
              this.setState({
                uploading : progress
              })           
              console.log(progress)
           },
          (err) => {
            this.catchError(err);
          },
          () => { 
              storage.ref('posts/images').child(currentImageName).getDownloadURL()
              .then(imageUrl => {                
                 postData.imageUrl = imageUrl
                 fetch(url,{
                  method : method,
                  body : JSON.stringify(postData),
                  headers : {
                    'Content-Type' : 'application/json',
                     Authorization : 'Bearer '+ this.props.token
                  }
                })
                  .then(res => {
                    if (res.status !== 200 && res.status !== 201) {
                      throw new Error('Creating or editing a post failed!');
                    }
                    return res.json();
                  })
                  .then(resData => {
                    console.log(resData);
                    const post = {
                      _id: resData.post._id,
                      title: resData.post.title,
                      content: resData.post.content,
                      creator: resData.post.creator,
                      createdAt: resData.post.createdAt
                    };
                    this.setState({
                        isEditing: false,
                        editPost: null,
                        editLoading: false
                    });
                    this.loadPosts();
                  })
                  .catch(err => {
                    console.log(err);
                    this.setState({
                      isEditing: false,
                      editPost: null,
                      editLoading: false,
                      error: err
                    });
                  });
              })
              .catch(this.catchError);
          }
      )
    }else if(this.state.editPost && postData.image){
      let currentImageName = "firebase-image-"+Date.now();
      let uploadImage = storage.ref(`posts/images/${currentImageName}`).put(postData.image);
      uploadImage.on('state_changed',
          (snapshot) => { 
              var progress = snapshot.bytesTransferred / snapshot.totalBytes * 100;
              this.setState({
                uploading : progress
              })           
              console.log(progress)
           },
          (err) => {
            this.catchError(err);
          },
          () => { 
              storage.ref('posts/images').child(currentImageName).getDownloadURL()
              .then(imageUrl => {                
                 postData.imageUrl = imageUrl
                 fetch(url,{
                  method : method,
                  body : JSON.stringify(postData),
                  headers : {
                    'Content-Type' : 'application/json',
                    Authorization : 'Bearer '+ this.props.token
                  }
                })
                  .then(res => {
                    if (res.status !== 200 && res.status !== 201) {
                      throw new Error('Creating or editing a post failed!');
                    }
                    return res.json();
                  })
                  .then(resData => {
                    console.log(resData);
                   
                    let deleteImage = storage.refFromURL(resData.post.imageUrl).delete();
                    return deleteImage;
                  
                  
                  })
                  .then(result=>{
                    console.log('image deleted from firebase successfully.')
                    console.log(result)
                    this.setState({                  
                      isEditing: false,
                      editPost: null,
                      editLoading: false
                    });
                    this.loadPosts();

                  })
                  .catch(err => {
                    console.log(err);
                    this.setState({
                      isEditing: false,
                      editPost: null,
                      editLoading: false,
                      error: err
                    });
                  });
              })
              .catch(this.catchError);
          }
      )
    }else if(this.state.editPost && !postData.image){
      console.log(url)
      fetch(url,{
        method : method,
        body : JSON.stringify(postData),
        headers : {
          'Content-Type' : 'application/json',
          Authorization : 'Bearer '+ this.props.token
        }
      })
        .then(res => {
          if (res.status !== 200 && res.status !== 201) {
            throw new Error('Creating or editing a post failed!');
          }
          return res.json();
        })
        .then(resData => {
          console.log(resData);
          const post = {
            _id: resData.post._id,
            title: resData.post.title,
            content: resData.post.content,
            creator: resData.post.creator,
            createdAt: resData.post.createdAt
          };
          this.setState({
              isEditing: false,
              editPost: null,
              editLoading: false
          });
          console.log('load posts')
          this.loadPosts();
        })
        .catch(err => {
          console.log(err);
          this.setState({
            isEditing: false,
            editPost: null,
            editLoading: false,
            error: err
          });
          this.catchError(err)
        });
    }

  
     
  };

  statusInputChangeHandler = (input, value) => {
    this.setState({ status: value });
  };

  deletePostHandler = (postId,imageUrl) => {
    this.setState({ postsLoading: true });
    console.log(postId)
    let deleteImage = storage.refFromURL(imageUrl).delete();
    deleteImage.then(result=>{
          fetch(`https://lit-cliffs-27689.herokuapp.com/feed/delete-post/${postId}`,{
            method : 'DELETE',
            Authorization : 'Bearer '+ this.props.token
          })
          .then(res => {
            if (res.status !== 200 && res.status !== 201) {
              throw new Error('Deleting a post failed!');
            }
            return res.json();
          })
          .then(resData => {
            console.log(resData);
            this.setState(prevState => {
              const updatedPosts = prevState.posts.filter(p => p._id !== postId);
              return { posts: updatedPosts, postsLoading: false };
            });
          })
          .catch(err => {
            console.log(err);
            this.setState({ postsLoading: false });
            this.catchError(err)
          });
    }).catch(this.catchError)  
    
  };

  errorHandler = () => {
    this.setState({ error: null });
  };

  catchError = error => {
    this.setState({ error: error });
  };

  render() {
    return (
      <Fragment>
        <ErrorHandler error={this.state.error} onHandle={this.errorHandler} />
        <FeedEdit
          editing={this.state.isEditing}
          selectedPost={this.state.editPost}
          loading={this.state.editLoading}
          onCancelEdit={this.cancelEditHandler}
          onFinishEdit={this.finishEditHandler}
          uploading={this.state.uploading}
        />
        <section className="feed__status">
          <form onSubmit={this.statusUpdateHandler}>
            <Input
              type="text"
              placeholder="Your status"
              control="input"
              onChange={this.statusInputChangeHandler}
              value={this.state.status}
            />
            <Button mode="flat" type="submit">
              Update
            </Button>
          </form>
        </section>
        <section className="feed__control">
          <Button mode="raised" design="accent" onClick={this.newPostHandler}>
            New Post
          </Button>
        </section>
        <section className="feed">
          {this.state.postsLoading && (
            <div style={{ textAlign: 'center', marginTop: '2rem' }}>
              <Loader />
            </div>
          )}
          {this.state.posts.length <= 0 && !this.state.postsLoading ? (
            <p style={{ textAlign: 'center' }}>No posts found.</p>
          ) : null}
          {!this.state.postsLoading && (
            <Paginator
              onPrevious={this.loadPosts.bind(this, 'previous')}
              onNext={this.loadPosts.bind(this, 'next')}
              lastPage={Math.ceil(this.state.totalPosts / 2)}
              currentPage={this.state.postPage}
            >
              {this.state.posts.map(post => (
                <Post
                  key={post._id}
                  id={post._id}
                  author={post.creator.name}
                  date={new Date(post.createdAt).toLocaleDateString('en-US')}
                  title={post.title}
                  image={post.imageUrl}
                  content={post.content}
                  onStartEdit={this.startEditPostHandler.bind(this, post._id)}
                  onDelete={() => this.deletePostHandler(post._id,post.imageUrl)}
                />
              ))}
            </Paginator>
          )}
        </section>
      </Fragment>
    );
  }
}

export default Feed;
